import { connectToBroker, sendMessage } from "../lib/ws-client.js";
import { layouts } from "./layouts/index.js";

function el(tag) {
  return document.createElement(tag);
}

function renderLayout(layout) {
  const container = document.querySelector(".controls");
  container.innerHTML = "";
  container.className = `controls ${layout.containerClass || ""}`.trim();

  for (const c of layout.controls) {
    if (c.type === "knob") {
      const k = el("webaudio-knob");
      k.id = c.id;
      k.min = c.min;
      k.max = c.max;
      k.step = c.step;
      k.setAttribute("width", String(c.width));
      k.setAttribute("height", String(c.height));
      if (c.colors) k.colors = c.colors;

      k.addEventListener("input", (e) => {
        sendMessage(c.oscPath, parseFloat(e.target.value));
      });

      container.appendChild(k);
      continue;
    }

    if (c.type === "slider") {
      const s = el("webaudio-slider");
      s.id = c.id;
      s.min = c.min;
      s.max = c.max;
      s.step = c.step;
      s.setAttribute("direction", c.direction || "horiz");
      s.setAttribute("width", String(c.width));
      s.setAttribute("height", String(c.height));
      if (c.colors) s.colors = c.colors;

      s.addEventListener("input", (e) => {
        sendMessage(c.oscPath, parseFloat(e.target.value));
      });

      container.appendChild(s);
      continue;
    }

    console.warn("Unknown control type:", c);
  }
}

function clampLayoutIndex(i) {
  const n = layouts.length;
  return ((i % n) + n) % n;
}

function setLayoutIndex(i) {
  const idx = clampLayoutIndex(i);
  localStorage.setItem("virtualctl.layout", String(idx));
  const layout = layouts[idx];
  document.getElementById("layoutTitle").textContent = layout.title || layout.id;
  renderLayout(layout);
}

function getInitialLayoutIndex() {
  const url = new URL(location.href);
  const q = url.searchParams.get("layout");
  if (q != null) {
    const n = Number(q);
    if (!Number.isNaN(n)) return clampLayoutIndex(n);
  }
  const saved = localStorage.getItem("virtualctl.layout");
  if (saved != null) {
    const n = Number(saved);
    if (!Number.isNaN(n)) return clampLayoutIndex(n);
  }
  return 0;
}

window.addEventListener("load", () => {
  const id = new URLSearchParams(location.search).get("id") || "default";
  connectToBroker(id);

  const idx = getInitialLayoutIndex();
  setLayoutIndex(idx);

  document.getElementById("prevLayout").addEventListener("click", () => {
    const cur = Number(localStorage.getItem("virtualctl.layout") || "0");
    setLayoutIndex(cur - 1);
  });

  document.getElementById("nextLayout").addEventListener("click", () => {
    const cur = Number(localStorage.getItem("virtualctl.layout") || "0");
    setLayoutIndex(cur + 1);
  });

  registerSW();
});

async function registerSW() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register(new URL("./sw.js", import.meta.url));
    } catch (e) {
      console.log("Service Worker registration failed:", e);
    }
  }
}
