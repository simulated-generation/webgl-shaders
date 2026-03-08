let ws = null;
let queue = [];
let connected = false;
let reconnectTimer = null;
let reconnectDelayMs = 2000;
let messageHandler = null;

function getBrokerHost() {
  if (location.hostname.endsWith("simulated-generation.xyz")) {
    return "broker.simulated-generation.xyz";
  }
  return "localhost:8080";
}

function scheduleReconnect(id) {
  if (reconnectTimer !== null) {
    return;
  }

  console.log(`[ws] disconnected, retrying in ${reconnectDelayMs / 1000}s`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToBroker(id);
    reconnectDelayMs = Math.min(reconnectDelayMs * 1.5, 10000);
  }, reconnectDelayMs);
}

export function onBrokerMessage(handler) {
  messageHandler = handler;
}

export function connectToBroker(id) {
  const isSecure = location.protocol === "https:";
  const scheme = isSecure ? "wss" : "ws";
  const host = getBrokerHost();
  const url = `${scheme}://${host}/ws?id=${encodeURIComponent(id)}`;

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  console.log("[ws] connecting:", url);
  ws = new WebSocket(url);

  ws.onopen = () => {
    connected = true;
    reconnectDelayMs = 2000;
    console.log("[ws] connected");

    queue.forEach((msg) => ws.send(JSON.stringify(msg)));
    queue = [];
  };

  ws.onmessage = (event) => {
    console.log("[ws] recv:", event.data);

    if (!messageHandler) {
      return;
    }

    try {
      const data = JSON.parse(event.data);
      messageHandler(data);
    } catch (error) {
      console.log("[ws] invalid message:", error);
    }
  };

  ws.onerror = (error) => {
    console.log("[ws] error:", error);
  };

  ws.onclose = () => {
    connected = false;
    scheduleReconnect(id);
  };
}

export function sendMessage(path, value) {
  const msg = {
    type: "osc",
    path,
    args: [
      { t: "f", v: Number(value) }
    ]
  };

  if (connected && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
    return;
  }

  queue.push(msg);
}
