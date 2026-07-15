#!/usr/bin/env python3
"""
tutor_gateway.py — the "middle box": a tiny local AI gateway.

  [math tutor webpage] --> [THIS GATEWAY: listens on an IP, checks YOUR key,
                            adds browser CORS headers, logs traffic]
                              --> [local LLM: llama-server / Ollama / LM Studio]

Flip it on:      python tutor_gateway.py
Point apps at:   http://127.0.0.1:8090/v1/chat/completions   (key: whatever you set below)
Flip it off:     Ctrl+C

Zero dependencies — Python 3 standard library only.
Copyright (c) 2026 Steveon William Walker. MIT.
"""

import json, os, sys, time, socket, secrets, subprocess, threading, urllib.request, urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler, ThreadingHTTPServer

# ============================== YOUR SETTINGS ==============================
HOST = "127.0.0.1"        # 127.0.0.1 = this PC only. "0.0.0.0" = phones/laptops on
                          # your wifi can use it too (only do that on a home network).
PORT = 8090               # where apps connect to THIS gateway
GATEWAY_KEY = "54"        # the key YOUR apps use. Any string you like.

# --- Where the model lives (pick ONE mode) ---
# MODE A: forward to a backend that's already running (Ollama, LM Studio,
#         LocalChatBox's llama-server, anything OpenAI-compatible):
BACKEND_URL = "http://127.0.0.1:8080/v1/chat/completions"
BACKEND_KEY = ""          # backend's key if it has one ("" = none / Ollama / LM Studio)

# MODE B: let the gateway LAUNCH llama-server itself ("flip one switch, get a brain").
#         Set both paths and the gateway spawns + owns the model server:
LLAMA_SERVER = ""         # e.g. r"C:\LocalChatBox\runtime\win\llama-server.exe"
MODEL_PATH   = ""         # e.g. r"C:\LocalChatBox\models\qwen2.5-7b-instruct-q4_k_m.gguf"
LLAMA_PORT   = 8080       # internal port for the spawned model server
LLAMA_CTX    = 8192
# ===========================================================================

STARTED = time.time()
COUNT = {"ok": 0, "err": 0}

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

def launch_llama():
    """MODE B: spawn llama-server with an internal random key; rewire BACKEND_*."""
    global BACKEND_URL, BACKEND_KEY
    internal_key = secrets.token_hex(16)
    args = [LLAMA_SERVER, "-m", MODEL_PATH, "--port", str(LLAMA_PORT),
            "--host", "127.0.0.1", "-c", str(LLAMA_CTX)]
    env = dict(os.environ, LLAMA_API_KEY=internal_key)
    log(f"launching model server: {os.path.basename(LLAMA_SERVER)} + {os.path.basename(MODEL_PATH)}")
    proc = subprocess.Popen(args, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    BACKEND_URL = f"http://127.0.0.1:{LLAMA_PORT}/v1/chat/completions"
    BACKEND_KEY = internal_key
    # wait for it to come up
    health = f"http://127.0.0.1:{LLAMA_PORT}/health"
    for _ in range(120):
        try:
            if urllib.request.urlopen(health, timeout=2).status == 200:
                log("model server is up (internal key held by gateway only)")
                return proc
        except Exception:
            time.sleep(1)
    log("ERROR: model server never came up — check LLAMA_SERVER/MODEL_PATH")
    proc.terminate(); sys.exit(1)

class Gateway(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, *a): pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code); self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def _authed(self):
        auth = self.headers.get("Authorization", "")
        return auth == f"Bearer {GATEWAY_KEY}"

    def do_OPTIONS(self):
        self.send_response(204); self._cors()
        self.send_header("Content-Length", "0"); self.end_headers()

    def do_GET(self):
        if self.path in ("/", "/health", "/status"):
            up = int(time.time() - STARTED)
            self._reply(200, {"gateway": "tutor_gateway", "status": "on",
                              "uptime_s": up, "requests_ok": COUNT["ok"],
                              "requests_err": COUNT["err"], "backend": BACKEND_URL})
        elif self.path.startswith("/v1/models"):
            self._reply(200, {"object": "list",
                              "data": [{"id": "local-gateway-model", "object": "model"}]})
        else:
            self._reply(404, {"error": "unknown path"})

    def do_POST(self):
        if not self.path.startswith("/v1/chat/completions"):
            self._reply(404, {"error": "unknown path"}); return
        if not self._authed():
            COUNT["err"] += 1
            self._reply(401, {"error": {"message": "bad gateway key"}}); return
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n)
        t0 = time.time()
        headers = {"Content-Type": "application/json"}
        if BACKEND_KEY:
            headers["Authorization"] = f"Bearer {BACKEND_KEY}"   # inject the REAL key
        req = urllib.request.Request(BACKEND_URL, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=600) as res:
                out = res.read()
            COUNT["ok"] += 1
            log(f"routed {n:,}B in -> {len(out):,}B out ({time.time()-t0:.1f}s)")
            self.send_response(200); self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(out)))
            self.end_headers(); self.wfile.write(out)
        except urllib.error.HTTPError as e:
            COUNT["err"] += 1
            err = e.read()
            log(f"backend error {e.code}: {err[:120]!r}")
            self.send_response(e.code); self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(err)))
            self.end_headers(); self.wfile.write(err)
        except Exception as e:
            COUNT["err"] += 1
            log(f"backend unreachable: {e}")
            self._reply(502, {"error": {"message": f"backend unreachable: {e}"}})

def main():
    proc = None
    if LLAMA_SERVER and MODEL_PATH:
        proc = launch_llama()
    ip_note = "this PC only" if HOST == "127.0.0.1" else "ANY device on your network"
    log("=" * 56)
    log(f"GATEWAY ON  ->  http://{HOST}:{PORT}/v1/chat/completions")
    log(f"key: '{GATEWAY_KEY}'   reachable from: {ip_note}")
    if HOST != "127.0.0.1":
        try:
            lan = socket.gethostbyname(socket.gethostname())
            log(f"phone/laptop endpoint: http://{lan}:{PORT}/v1/chat/completions")
        except Exception: pass
    log(f"backend: {BACKEND_URL}")
    log("Ctrl+C to flip it off")
    log("=" * 56)
    try:
        ThreadingHTTPServer((HOST, PORT), Gateway).serve_forever()
    except KeyboardInterrupt:
        log("gateway off")
    finally:
        if proc: proc.terminate()

if __name__ == "__main__":
    main()
