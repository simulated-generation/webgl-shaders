# 🎛️ Simulated Generation — Shader + Controller + OSC Broker System

A modular WebGL performance environment combining shaders, controllers, and an OSC-style message broker.  
All components are deployed via `docker compose` and served under TLS using **Caddy**.

---

## 🧩 Architecture Overview

```
project/
├── docker-compose.yml
├── src/
│   ├── webgl-shader-demo/   # Static GLSL/WebGL sandbox (frontend)
│   ├── controller/           # Virtual knob controller (frontend)
│   └── broker/               # WebSocket OSC relay (backend)
└── volumes/
    └── broker/logs/          # Persistent logs
```

Each component is self-contained and built in its own Docker image.
Caddy serves both static apps and proxies WebSocket traffic.

---

## ⚙️ Components

| Component | Description | Tech Stack | Exposed As |
|------------|--------------|-------------|-------------|
| **Shader App** | WebGL shader demo receiving live OSC messages | Caddy + Vanilla JS + GLSL | `https://shaders.simulated-generation.xyz` |
| **Controller App** | PWA controller with knobs/faders sending OSC-like messages | Parcel + Vanilla JS + WebAudio Knobs | `https://control.simulated-generation.xyz` |
| **Broker** | Stateless Python FastAPI WebSocket relay routing JSON messages by room ID | Python 3.11 + FastAPI + `websockets` | `wss://broker.simulated-generation.xyz` |
| **Caddy** | Reverse proxy, static file server, automatic TLS | Caddy 2 | `*:443` |

---

## 🌐 Domains and Routing

You must configure three subdomains on your DNS provider (e.g. Namecheap):

| Subdomain | Purpose | Target |
|------------|----------|--------|
| `shaders.simulated-generation.xyz` | Serves the shader app | Your server’s public IP |
| `control.simulated-generation.xyz` | Serves the controller app | Same IP |
| `broker.simulated-generation.xyz` | Proxies WebSocket traffic to the Python broker | Same IP |

Each subdomain should have an **A record** pointing to your host (no CNAME).

Caddy automatically issues Let’s Encrypt certificates for all three.

---

## 🚀 Usage

### 1. Build and launch

```bash
docker compose up --build -d
```

Caddy will automatically request TLS certificates for all three subdomains.

### 2. Verify services

- Shader app → https://shaders.simulated-generation.xyz/?id=test-room  
- Controller app → https://control.simulated-generation.xyz/?id=test-room  
- Broker health check → https://broker.simulated-generation.xyz/health → returns `ok`

### 3. Observe live message flow

Open browser devtools (F12):

- On the shader page, you should see logs like:
  ```
  [broker] connected to wss://broker.simulated-generation.xyz/ws?id=test-room
  [OSC message] {type:"osc", path:"/virtualctl/K01", args:[{t:"f",v:0.3}]}
  ```

- On the controller page, moving knobs should log:
  ```
  Sending OSC: /virtualctl/K01 0.3
  ```

---

## 🧠 System Behavior

### WebSocket Message Format

All messages follow an **OSC-like JSON** schema:

```json
{
  "type": "osc",
  "path": "/virtualctl/K01",
  "args": [ { "t": "f", "v": 0.42 } ]
}
```

| Key | Description |
|------|--------------|
| `type` | Always `"osc"` |
| `path` | OSC-style path string |
| `args` | List of typed arguments (`t`: type, `v`: value) |
| `t` | `"f"` float, `"i"` int, `"s"` string |

Messages are **broadcast to all other clients** connected with the same `id` (room).

---

## 🧾 Broker Logging

If `VERBOSE=true` in `docker-compose.yml`, logs will be written to `/logs/broker.log`:

```
[JOIN] room=test-room client=192.168.1.10
[MSG] room=test-room json={"type":"osc","path":"/foo","args":[{"t":"f","v":0.8}]}
[LEAVE] room=test-room client=192.168.1.10
```

---

## 🧩 Development Tips

| Task | Command |
|------|----------|
| Rebuild everything | `docker compose build --no-cache` |
| Tail logs | `docker compose logs -f broker` |

---

## 🪶 Notes on Separation of Concerns

| Layer | Responsibility |
|--------|----------------|
| **Broker** | Stateless message relay; no user logic or persistence |
| **Shader App** | Renders GLSL + listens to incoming OSC data |
| **Controller App** | UI with knobs/sliders that sends OSC data |
| **Caddy** | Serves static files and handles TLS termination |
| **docker-compose.yml** | Integration layer; defines network topology and volume mapping |

---

## 🧰 Technology Stack Summary

- **Python 3.11** (FastAPI, websockets)
- **Caddy 2** (static + reverse proxy)
- **Vanilla JS + GLSL** (shader frontend)
- **Parcel** (controller build)
- **Docker Compose** (deployment orchestration)
- **Alpine-based images** for minimal footprint

---

## ✅ Checklist

- [x] Shader reachable via `https://shaders.simulated-generation.xyz`
- [x] Controller reachable via `https://control.simulated-generation.xyz`
- [x] Broker reachable via `wss://broker.simulated-generation.xyz/ws?id=test`
- [x] Messages flow correctly between both apps
- [x] All containers restart automatically on failure

---

## 🧑‍💻 License

MIT © Simulated Generation
