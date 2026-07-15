# Tutor Gateway — How-To

One small program (`tutor-gateway.exe`) that sits between your apps and a local AI model:

```
[Math Worksheet page]  -->  [tutor-gateway.exe]  -->  [AI model on your PC]
     asks with key "54"       checks key, routes        thinks, answers
```

Flip it on: double-click the exe. Flip it off: close the window.
No installs. No accounts. No internet needed.

---

## 1. First run (30 seconds)

1. Put `tutor-gateway.exe` in a folder you like (e.g. `C:\TutorGateway\`).
2. Double-click it.
   - Windows SmartScreen may complain (unsigned app): click **More info → Run anyway**.
   - A black console window opens and prints a banner like:
     ```
     GATEWAY ON  ->  http://127.0.0.1:8090/v1/chat/completions
     key: '54'   reachable from: this PC only
     ```
3. On first run it **creates `gateway.json` next to itself**. That file is all your settings.
4. Close the window. Now edit `gateway.json` (right-click → Open with → Notepad).

---

## 2. Pick your mode (edit gateway.json)

### MODE A — Forward: you already run a model some other way

Use this if you have **Ollama**, **LM Studio**, or a **llama-server** already running.

```json
{
  "host": "127.0.0.1",
  "port": 8090,
  "gateway_key": "54",
  "backend_url": "http://127.0.0.1:11434/v1/chat/completions",
  "backend_key": "",
  "llama_server": "",
  "model_path": ""
}
```

Set `backend_url` to wherever your model listens:

| You run…            | backend_url                                        | backend_key |
|---------------------|----------------------------------------------------|-------------|
| Ollama              | `http://127.0.0.1:11434/v1/chat/completions`       | leave `""`  |
| LM Studio           | `http://127.0.0.1:1234/v1/chat/completions`        | leave `""`  |
| llama-server you started with `--api-key abc` | `http://127.0.0.1:8080/v1/chat/completions` | `"abc"`     |

### MODE B — Launch: the gateway starts the model itself (one-click brain)

Use this if you want double-click = everything on. Fill in **both** paths:

```json
{
  "host": "127.0.0.1",
  "port": 8090,
  "gateway_key": "54",
  "backend_url": "",
  "backend_key": "",
  "llama_server": "C:\\LocalChatBox\\runtime\\win\\llama-server.exe",
  "model_path": "C:\\LocalChatBox\\models\\qwen2.5-7b-instruct-q4_k_m.gguf",
  "llama_port": 8080,
  "llama_ctx": 8192
}
```

- `llama_server`: any llama-server.exe. If you installed LocalChatBox, it already
  downloaded one — reuse it (look in its runtime folder). Or grab one from the
  llama.cpp releases page.
- `model_path`: any `.gguf` model file. 7B–8B models give much better tutoring
  than tiny ones; 4-bit ("q4") versions are the usual pick.
- JSON rule: in paths use **double backslashes** `\\` (see example above).
- The gateway starts the model with a **random internal key only it knows**,
  and shuts the model down when you close the gateway. No leftovers.

Save the file, double-click the exe again. In Mode B the banner appears **after**
the model finishes loading (a few seconds on GPU, up to a minute or two on CPU).

---

## 3. Point the Math Worksheet Builder at it

1. Open the worksheet app, expand **AI tutor (bring your own key)**.
2. Set:
   - **Provider:** `OpenAI-compatible (custom URL)`
   - **Endpoint URL:** `http://127.0.0.1:8090/v1/chat/completions`
   - **Model:** anything (the gateway's model answers regardless — type `local`)
   - **API key:** whatever your `gateway_key` says (e.g. `54`)
3. Take a quiz → **Ask AI tutor**. Watch the gateway's console print a line like
   `routed 5,696B in -> 2,352B out (12.3s)` — that's your tutoring traffic.

Any other app that speaks the OpenAI API can point at the same endpoint + key.

---

## 3½. The built-in chatroom

The gateway ships with a chat page inside it. With the gateway on, open:

```
http://127.0.0.1:8090/chat
```

That's a full chatroom talking to your model — no setup, no file, no key entry
(it's same-origin, already trusted). There's also a standalone `LocalChat.html`
you can open anywhere and point at any endpoint via its Settings button.

---

## 4. Phone on the couch, brain on the PC (optional)

1. In `gateway.json` set `"host": "0.0.0.0"` and restart the gateway.
2. The banner now also prints your LAN address, e.g.
   `phone/laptop endpoint: http://192.168.1.23:8090/v1/chat/completions`
3. On your phone (same wifi), open your worksheet site and use **that** URL
   + your key in the AI tutor settings.

Only do this on a home network you trust — anyone on the wifi who knows the
key can use your model (they still can't see your files, just ask it questions).
Set `host` back to `127.0.0.1` to close the door.

---

## 5. Checking on it

- **Is it on?** Visit `http://127.0.0.1:8090/` in a browser — you get a status
  page with uptime and request counts.
- **Console log** shows one line per routed request.
- **Turn it off:** close the window (Ctrl+C also works). In Mode B this also
  stops the model server it launched.

---

## 6. When something's wrong

| Symptom | Fix |
|---|---|
| SmartScreen blocks the exe | More info → Run anyway (it's unsigned, not malicious) |
| "bad gateway key" / 401 in the worksheet | The key in the worksheet must exactly match `gateway_key` in gateway.json |
| "backend unreachable" | Mode A: your model app isn't running, or `backend_url` has the wrong port. Mode B: check both paths in gateway.json |
| Model never comes up (Mode B) | Wrong `llama_server` or `model_path`; test the model in LocalChatBox/LM Studio first |
| Replies are slow | Normal on CPU with big models. Smaller model, or GPU build of llama-server |
| Tutor gives weird/invented diagnoses | Model too small — 1–3B models ramble; use 7B+ for real tutoring |
| Answer cuts off mid-sentence | Raise `llama_ctx` (8192 is a good default) or keep quizzes ≤ 10 questions |
| Something else already uses port 8090 | Change `port` in gateway.json (and update the worksheet endpoint to match) |
| Phone can't connect | `host` must be `0.0.0.0`, phone on the same wifi, and Windows Firewall may ask to allow the app — say yes |

---

## What the pieces are

- **tutor-gateway.exe** — the whole program (Windows). Close = off.
- **gateway.json** — your settings, created on first run, edit in Notepad.
- **tutor-gateway-main.go** — the source code (build your own: `go build`).
- **tutor_gateway.py** — same idea in Python, for tinkering.
- **LocalChat.html** — standalone chatroom; the same page is baked into the exe at `/chat`.

The gateway never stores your conversations, never touches the internet on its
own, and only ever talks to the backend you configured. The key is a handshake
between your own apps on your own machine — that's the whole trick.

*Copyright (c) 2026 Steveon William Walker. MIT.*
