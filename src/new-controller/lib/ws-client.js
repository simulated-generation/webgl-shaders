let ws = null;
let queue = [];
let connected = false;
let reconnectTimer = null;
let reconnectDelayMs = 2000;
let messageHandler = null;

let pendingBinaryImage = null;

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
  ws.binaryType = "blob";

  ws.onopen = () => {
    connected = true;
    reconnectDelayMs = 2000;
    console.log("[ws] connected");

    queue.forEach((msg) => ws.send(JSON.stringify(msg)));
    queue = [];
  };

  ws.onmessage = async (event) => {
    if (typeof event.data === "string") {
      console.log("[ws] recv:", event.data);

      let data;
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.log("[ws] invalid JSON message:", error);
        return;
      }

      if (data && data.type === "image") {
        pendingBinaryImage = data;
      }

      if (messageHandler) {
        messageHandler(data);
      }
      return;
    }

    if (event.data instanceof Blob) {
      console.log("[ws] recv: <binary blob>", event.data.size, "bytes");

      if (pendingBinaryImage && messageHandler) {
        const header = pendingBinaryImage;
        pendingBinaryImage = null;

        const imageMessage = {
          type: "image-binary",
          header,
          blob: event.data,
        };

        messageHandler(imageMessage);
      } else {
        console.log("[ws] unexpected binary frame with no pending image header");
      }
      return;
    }

    console.log("[ws] recv: unknown frame type", event.data);
  };

  ws.onerror = (error) => {
    console.log("[ws] error:", error);
  };

  ws.onclose = () => {
    connected = false;
    pendingBinaryImage = null;
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
