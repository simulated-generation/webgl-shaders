import { connectToBroker, sendMessage } from "../lib/ws-client.js";

function createKnobs(num) {
  const container = document.querySelector(".knobs");
  container.innerHTML = "";
  for (let i = 1; i <= num; i++) {
    const knob = document.createElement("webaudio-knob");
    knob.id = `knob${i}`;
    knob.min = 0;
    knob.max = 1;
    knob.step = 0.001;
    knob.setAttribute("width", "46");
    knob.setAttribute("height", "46");
    knob.colors =  '#81a1c1;#4c566a;#444';
    knob.addEventListener("input", e => {
      const path = `/virtualctl/K${String(i).padStart(2, "0")}`;
      sendMessage(path, parseFloat(e.target.value));
    });
    container.appendChild(knob);
  }
}

window.addEventListener("load", () => {
  const id = new URLSearchParams(location.search).get("id") || "default";
  connectToBroker(id);
  createKnobs(128);
  registerSW();
});


//// Register the service worker for PWA
async function registerSW() {
  console.log("Registering");
  console.log(navigator);
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register(new URL('./sw.js', import.meta.url));
    } catch(e) {
      console.log("Service Worker registration failed:", e);
    }
  }
}
