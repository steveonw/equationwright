// tutor-gateway — a standalone local AI proxy in one program.
//
//	[math tutor / any app] -> [THIS PROGRAM: your key, CORS, on/off]
//	                             -> [the LLM on your computer]
//
// Run it: double-click (Windows) or ./tutor-gateway. Ctrl+C / close = off.
// Settings: gateway.json next to the exe (created on first run), or flags.
//
// Copyright (c) 2026 Steveon William Walker. MIT.
package main

import (
	_ "embed"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

type Config struct {
	Host        string `json:"host"`          // "127.0.0.1" = this PC only; "0.0.0.0" = your wifi too
	Port        int    `json:"port"`          // where apps connect to THIS gateway
	GatewayKey  string `json:"gateway_key"`   // the key YOUR apps use (any string, e.g. "54")
	BackendURL  string `json:"backend_url"`   // an LLM server already running (Ollama/LM Studio/llama-server)
	BackendKey  string `json:"backend_key"`   // its key, if it has one ("" = none)
	LlamaServer string `json:"llama_server"`  // OPTIONAL: path to llama-server(.exe) -> gateway launches it
	ModelPath   string `json:"model_path"`    // OPTIONAL: path to a .gguf model (used with llama_server)
	LlamaPort   int    `json:"llama_port"`    // internal port for the launched model server
	LlamaCtx    int    `json:"llama_ctx"`     // context length for the launched model server
}

//go:embed localchat.html
var chatHTML []byte

var (
	cfg     Config
	started = time.Now()
	nOK, nErr int
)

func defaults() Config {
	return Config{Host: "127.0.0.1", Port: 8090, GatewayKey: "54",
		BackendURL: "http://127.0.0.1:8080/v1/chat/completions",
		LlamaPort: 8080, LlamaCtx: 8192}
}

func loadConfig() {
	cfg = defaults()
	exe, _ := os.Executable()
	path := filepath.Join(filepath.Dir(exe), "gateway.json")
	if b, err := os.ReadFile(path); err == nil {
		if err := json.Unmarshal(b, &cfg); err != nil {
			log.Printf("gateway.json has a problem (%v) — using defaults", err)
		} else {
			log.Printf("settings loaded from %s", path)
		}
	} else {
		// first run: write the file so the user can edit it
		b, _ := json.MarshalIndent(cfg, "", "  ")
		if os.WriteFile(path, b, 0644) == nil {
			log.Printf("created %s — edit it to change settings", path)
		}
	}
	// flags override the file
	flag.StringVar(&cfg.Host, "host", cfg.Host, "bind address")
	flag.IntVar(&cfg.Port, "port", cfg.Port, "gateway port")
	flag.StringVar(&cfg.GatewayKey, "key", cfg.GatewayKey, "gateway API key")
	flag.StringVar(&cfg.BackendURL, "backend", cfg.BackendURL, "backend chat/completions URL")
	flag.StringVar(&cfg.BackendKey, "backend-key", cfg.BackendKey, "backend API key")
	flag.StringVar(&cfg.LlamaServer, "llama-server", cfg.LlamaServer, "path to llama-server to launch")
	flag.StringVar(&cfg.ModelPath, "model", cfg.ModelPath, "path to .gguf model to launch")
	flag.Parse()
}

func launchLlama() *exec.Cmd {
	kb := make([]byte, 16)
	rand.Read(kb)
	internal := hex.EncodeToString(kb)
	cfg.BackendURL = fmt.Sprintf("http://127.0.0.1:%d/v1/chat/completions", cfg.LlamaPort)
	cfg.BackendKey = internal
	cmd := exec.Command(cfg.LlamaServer, "-m", cfg.ModelPath,
		"--port", fmt.Sprint(cfg.LlamaPort), "--host", "127.0.0.1", "-c", fmt.Sprint(cfg.LlamaCtx))
	cmd.Env = append(os.Environ(), "LLAMA_API_KEY="+internal)
	cmd.Dir = filepath.Dir(cfg.LlamaServer) // so it finds its .so/.dll files
	if err := cmd.Start(); err != nil {
		log.Fatalf("could not launch model server: %v", err)
	}
	log.Printf("launching model server: %s + %s", filepath.Base(cfg.LlamaServer), filepath.Base(cfg.ModelPath))
	health := fmt.Sprintf("http://127.0.0.1:%d/health", cfg.LlamaPort)
	for i := 0; i < 180; i++ {
		if r, err := http.Get(health); err == nil {
			r.Body.Close()
			if r.StatusCode == 200 {
				log.Printf("model server is up (internal key held by this gateway only)")
				return cmd
			}
		}
		time.Sleep(time.Second)
	}
	cmd.Process.Kill()
	log.Fatal("model server never came up — check llama_server / model_path in gateway.json")
	return nil
}

func cors(w http.ResponseWriter) {
	h := w.Header()
	h.Set("Access-Control-Allow-Origin", "*")
	h.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	h.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	h.Set("Access-Control-Allow-Private-Network", "true")
}

func reply(w http.ResponseWriter, code int, obj any) {
	cors(w)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(obj)
}

func main() {
	log.SetFlags(log.Ltime)
	loadConfig()

	var child *exec.Cmd
	if cfg.LlamaServer != "" && cfg.ModelPath != "" {
		child = launchLlama()
	}

	client := &http.Client{Timeout: 10 * time.Minute}

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "OPTIONS" { cors(w); w.WriteHeader(204); return }
		reply(w, 200, map[string]any{"gateway": "tutor-gateway", "status": "on",
			"uptime_s": int(time.Since(started).Seconds()),
			"requests_ok": nOK, "requests_err": nErr, "backend": cfg.BackendURL})
	})
	mux.HandleFunc("/chat", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(chatHTML)
	})
	mux.HandleFunc("/v1/models", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "OPTIONS" { cors(w); w.WriteHeader(204); return }
		reply(w, 200, map[string]any{"object": "list",
			"data": []map[string]any{{"id": "local-gateway-model", "object": "model"}}})
	})
	mux.HandleFunc("/v1/chat/completions", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "OPTIONS" { cors(w); w.WriteHeader(204); return }
		if r.Header.Get("Authorization") != "Bearer "+cfg.GatewayKey {
			nErr++
			reply(w, 401, map[string]any{"error": map[string]any{"message": "bad gateway key"}})
			return
		}
		body, _ := io.ReadAll(r.Body)
		t0 := time.Now()
		req, _ := http.NewRequest("POST", cfg.BackendURL, strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		if cfg.BackendKey != "" {
			req.Header.Set("Authorization", "Bearer "+cfg.BackendKey) // inject the REAL key
		}
		res, err := client.Do(req)
		if err != nil {
			nErr++
			log.Printf("backend unreachable: %v", err)
			reply(w, 502, map[string]any{"error": map[string]any{"message": "backend unreachable: " + err.Error()}})
			return
		}
		defer res.Body.Close()
		out, _ := io.ReadAll(res.Body)
		if res.StatusCode == 200 { nOK++ } else { nErr++ }
		log.Printf("routed %dB in -> %dB out (%.1fs)", len(body), len(out), time.Since(t0).Seconds())
		cors(w)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(res.StatusCode)
		w.Write(out)
	})

	reach := "this PC only"
	if cfg.Host != "127.0.0.1" && cfg.Host != "localhost" {
		reach = "ANY device on your network"
	}
	line := strings.Repeat("=", 56)
	log.Println(line)
	log.Printf("GATEWAY ON  ->  http://%s:%d/v1/chat/completions", cfg.Host, cfg.Port)
	log.Printf("key: '%s'   reachable from: %s", cfg.GatewayKey, reach)
	if reach != "this PC only" {
		if addrs, err := net.InterfaceAddrs(); err == nil {
			for _, a := range addrs {
				if ip, ok := a.(*net.IPNet); ok && !ip.IP.IsLoopback() && ip.IP.To4() != nil {
					log.Printf("phone/laptop endpoint: http://%s:%d/v1/chat/completions", ip.IP, cfg.Port)
				}
			}
		}
	}
	log.Printf("built-in chatroom:  http://127.0.0.1:%d/chat", cfg.Port)
	log.Printf("backend: %s", cfg.BackendURL)
	log.Println("close this window / Ctrl+C to flip it off")
	log.Println(line)

	// clean shutdown: take the launched model server down with us
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sig
		if child != nil && child.Process != nil { child.Process.Kill() }
		os.Exit(0)
	}()

	err := http.ListenAndServe(fmt.Sprintf("%s:%d", cfg.Host, cfg.Port), mux)
	if child != nil && child.Process != nil { child.Process.Kill() }
	log.Fatal(err)
}
