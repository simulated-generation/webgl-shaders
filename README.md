# Simulated Generation – GLSL Screen Sandbox

## Overview

This project is a **minimal GLSL visual sandbox** designed for:

* Writing fragment shaders quickly
* Using CPU-driven simulation data inside shaders
* Using controller (OSC) parameters as uniforms
* Having automatic ping-pong feedback
* Running as a self-hosted web application

You do **not** need to understand the rendering pipeline to create visuals.

You only edit:

* `sim/sim.js`
* `shaders/content.frag`

Everything else is infrastructure.

---

# Architecture Overview

The system is split into three layers:

### 1. CPU Simulation (JavaScript)

File:

```
sim/sim.js
```

This generates data every frame.

It produces an array of points stored in a 1×N floating-point texture (`RGBA32F`).

Each texel contains:

```
R = xr   (sim-space x)
G = yi   (sim-space y)
B = x    (curve parameter / free slot)
A = i/N  (normalized index)
```

This is uploaded every frame as:

```
uniform sampler2D u_pointsTex;
uniform int u_pointCount;
```

---

### 2. Content Shader (Your Playground)

File:

```
shaders/content.frag
```

This is where you build visuals.

It receives:

#### Built-in uniforms

```
uniform float u_time;
uniform vec2  u_resolution;

uniform sampler2D u_prev;       // previous frame (ping-pong)
uniform sampler2D u_pointsTex;  // simulation data
uniform int u_pointCount;
```

#### Controller uniforms (from OSC)

Any controller path like:

```
/virtualctl/K002
```

Becomes a GLSL uniform:

```
uniform float u_virtualctl_K002;
```

You don’t need to register them manually. If you declare them in the shader, they will be set automatically.

---

### 3. Scene Renderer (Do Not Edit)

Files:

```
render/scene.js
shaders/scene.vert
shaders/scene.frag
```

This:

* Creates a 3D plane
* Applies camera
* Displays the texture produced by `content.frag`

You do not need to touch this part until you understand what it is about.

---

# Data Flow

Each frame:

1. CPU sim updates points
2. Points are uploaded to `u_pointsTex`
3. `content.frag` runs on a fullscreen surface
4. `u_prev` contains last frame result
5. Result becomes next frame texture
6. Scene displays that texture on a 3D plane

---

# Writing Visuals

You edit only:

```
shaders/content.frag
```

Basic structure:

```glsl
#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform sampler2D u_prev;
uniform sampler2D u_pointsTex;
uniform int u_pointCount;

void main() {
    vec2 uv = v_uv;

    vec3 prev = texture(u_prev, uv).rgb;

    // your visual logic here

    fragColor = vec4(prev, 1.0);
}
```

---

# Using Simulation Data

Helper to read a point:

```glsl
vec4 simPoint(int i) {
    float u = (float(i) + 0.5) / float(u_pointCount);
    return texture(u_pointsTex, vec2(u, 0.5));
}
```

Each `simPoint(i)` gives:

```
.xy = sim-space position
.z  = parameter value
.w  = normalized index
```

You must map sim-space to UV:

```glsl
vec2 simToUV(vec2 p) {
    float scale = 2.0;
    return 0.5 + 0.5 * (p / scale);
}
```

Then draw using distance fields, glow, metaballs, etc.

---

# Using Controller Parameters

If the controller sends:

```
/virtualctl/K003
```

Declare in shader:

```glsl
uniform float u_virtualctl_K003;
```

That’s it.

Use it to control:

* scale
* color
* decay
* warp strength
* iteration counts
* thresholds

Example:

```glsl
float decay = mix(0.95, 0.995, u_virtualctl_K003);
```

---

# Using Feedback (Ping-Pong)

You always have access to the previous frame:

```glsl
vec3 prev = texture(u_prev, uv).rgb;
```

Classic composition:

```glsl
float decay = 0.98;
vec3 newColor = ...;

vec3 outc = prev * decay + newColor;
```

This enables:

* trails
* temporal blur
* accumulation
* glitch feedback
* iterative simulation effects

You can also warp the previous frame:

```glsl
vec2 warp = 0.002 * vec2(sin(u_time), cos(u_time));
vec3 prev = texture(u_prev, uv + warp).rgb;
```

---

# Editing the Simulation

File:

```
sim/sim.js
```

Current sim generates a parametric complex exponential curve.

To change behavior:

* Change number of points
* Change parametric formula
* Change what you encode in RGBA

Example minimal sim:

```js
for (let i = 0; i < N; i++) {
    const a = i / N;
    const angle = a * Math.PI * 2 + t;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    points.push([x, y, a, a]);
}
```

As long as you output arrays shaped like:

```
[x, y, something, something]
```

The shader will receive it.

---

# What You Should Not Modify

* render pipeline
* camera
* FBO logic
* scene shaders
* WebSocket handling
* controller mapping

This is deliberate. The goal is isolation of creative logic.

---

# Self-Hosting & Deployment

This project is meant to be self-hosted.

You need:

* A VPS (any Linux server)
* A domain name
* Docker
* docker-compose
* Git

---

## 1. Get a Server

Minimum:

* 1GB RAM
* Ubuntu / Debian / Alpine
* Public IP

Open ports:

* 80
* 443

---

## 2. Install Docker & docker-compose

On server:

```bash
sudo apt install docker.io docker-compose git
```

(or equivalent for your distro)

---

## 3. Fork the Repository

Fork:

```
https://github.com/simulated-generation/webgl-shaders
```

Clone your fork:

```bash
git clone https://github.com/YOURNAME/webgl-shaders.git
cd webgl-shaders
```

---

## 4. Configure Domains

Edit:

```
src/caddy/Caddyfile
```

Set your domains:

```
shaders001.yourdomain.com {
    root * /srv/glsl-screen-refactor
    file_server
}

broker.yourdomain.com {
    reverse_proxy broker:8000
}

control.yourdomain.com {
    reverse_proxy controller:80
}
```

Make sure DNS A records point to your server.

---

## 5. docker-compose

From project root:

```bash
docker compose up -d --build
```

Caddy will automatically:

* Obtain TLS certificates
* Serve HTTPS
* Reverse proxy broker

---

## 6. Access

Open:

```
https://shaders001.yourdomain.com
```

Controller:

```
https://control.yourdomain.com
```

Broker:

```
wss://broker.yourdomain.com/ws?id=roomName
```

Use same `?id=` on controller and shader page to share a room.

---

# Using This With LLMs

You can safely give an LLM:

* This document
* Your `content.frag`
* Your `sim.js`

And ask:

* “Generate a fragment shader that uses u_pointsTex”
* “Modify sim to create a rotating spiral”
* “Use K003 to control decay”

Because:

* The rendering pipeline is fixed
* Data format is stable
* Uniform naming is deterministic
* No low-level WebGL code needs modification

This keeps prompts sharp and avoids pipeline confusion.

---

# Philosophy

This is intentionally:

* Minimal
* Deterministic
* Self-hosted
* Stateless
* Controller-driven
* Feedback-capable

It behaves like a small programmable console:

You provide:

* Simulation logic
* Fragment shader logic

The system handles:

* WebGL context
* Framebuffers
* Camera
* Networking
* Deployment
* TLS

---

If you want, next we can:

* Add multi-screen support cleanly
* Add preset saving
* Add hot shader reload
* Define a stricter sim data contract for future expansion

