let ws;
let queue = [];
let connected = false;

export function connectToBroker(id) {
  const isSecure = location.protocol === "https:";
  const host = location.hostname.endsWith("simulated-generation.xyz")
    ? "broker.simulated-generation.xyz"
    : "localhost:8080";
  const url = `${isSecure ? "wss" : "ws"}://${host}/ws?id=${encodeURIComponent(id)}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    connected = true;
    console.log("[ws] connected");
    queue.forEach(msg => ws.send(JSON.stringify(msg)));
    queue = [];
  };

  ws.onmessage = e => {
    console.log("[ws] recv:", e.data);
  };

  ws.onclose = () => {
    connected = false;
    console.log("[ws] disconnected — retrying in 2s");
    setTimeout(() => connectToBroker(id), 2000);
  };
}

export function sendMessage(path, value) {
  const msg = {
    type: "osc",
    path,
    args: [
      { t: "f", v: parseFloat(value) }  // always a float for knob values
    ]
  };
  if (connected && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  } else {
    queue.push(msg);
  }
}
