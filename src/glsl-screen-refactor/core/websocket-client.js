import { setControl } from './state.js';

export function connectBroker({ id, url, onMessage, onOpen, onClose, log = true } = {}) {
  const wsUrl = url || (() => {
    const isSecure = location.protocol === "https:";
    // If hosted on simulated-generation.xyz, use broker subdomain
    if (location.hostname.endsWith("simulated-generation.xyz")) {
      return `${isSecure ? "wss" : "ws"}://broker.simulated-generation.xyz/ws?id=${encodeURIComponent(id || "default")}`;
    }
    // Default local broker
    return `${isSecure ? "wss" : "ws"}://localhost:8000/ws?id=${encodeURIComponent(id || "default")}`;
  })();

  let ws;
  try {
    ws = new WebSocket(wsUrl);
  } catch (e) {
    if (log) console.warn("[broker] cannot create websocket:", e);
    return { ws: null, send: () => {} };
  }

  ws.onopen = (ev) => {
    if (log) console.log(`[broker] connected to ${wsUrl}`);
    try { ws.send(JSON.stringify({ type: "join", room: id || "default", role: "shader" })); } catch {}
    onOpen && onOpen(ev, ws);
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
      onMessage ? onMessage(msg) : (log && console.log("[broker message]", msg));
    } catch (err) {
      if (log) console.warn("Invalid JSON from broker:", event.data);
    }
  };

  ws.onclose = (ev) => {
    if (log) console.log("[broker] disconnected", ev.code, ev.reason || "");
    onClose && onClose(ev);
  };

  ws.onerror = (ev) => {
    // Connection refused will land here; keep it non-fatal.
    if (log) console.warn("[broker] websocket error (non-fatal)");
  };

  const send = (obj) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  };

  return { ws, send };
}
