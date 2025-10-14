// src/webgl-shader-demo/websocket-client.js
import { setControl } from './state.js';


export function connectBroker({ id, url, onMessage, onOpen, onClose, log = true }) {

  const wsUrl = url || (() => {
    const isSecure = location.protocol === "https:";
    // if we’re on shaders.* in production, talk to broker.*
    if (location.hostname.endsWith("simulated-generation.xyz")) {
      return `${isSecure ? "wss" : "ws"}://broker.simulated-generation.xyz/ws?id=${encodeURIComponent(id)}`;
    }
    // fallback for local dev
    return `${isSecure ? "wss" : "ws"}://localhost:8000/ws?id=${encodeURIComponent(id)}`;
  })();

  const ws = new WebSocket(wsUrl);

  ws.onopen = (ev) => {
    if (log) console.log(`[broker] connected to ${wsUrl}`);
    // inform others (optional meta)
    try {
      ws.send(JSON.stringify({ type: "join", room: id, role: "shader" }));
    } catch (e) { /* ignore */ }
    if (onOpen) onOpen(ev, ws);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "osc" && msg.path && Array.isArray(msg.args)) {
        const arg = msg.args[0];
        if (arg && (arg.t === "f" || arg.t === "i")) {
          setControl(msg.path, parseFloat(arg.v));
        }
      }
      if (onMessage) onMessage(msg);
      else console.log("[broker message]", msg);
    } catch (err) {
      console.error("Invalid JSON from broker:", event.data);
    }
  };

  ws.onclose = (ev) => {
    if (log) console.log("[broker] disconnected", ev);
    if (onClose) onClose(ev);
  };

  ws.onerror = (ev) => {
    if (log) console.error("[broker] websocket error", ev);
  };

  const send = (obj) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    } else {
      console.warn("[broker] ws not open, can't send", obj);
    }
  };

  return { ws, send };
}

