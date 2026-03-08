import { connectToBroker, sendMessage, onBrokerMessage } from "./lib/ws-client.js";

let syncEnabled = false;
let isApplyingRemoteUpdate = false;

async function registerSW() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
      console.log("[pwa] service worker registered");
    } catch (error) {
      console.log("[pwa] service worker registration failed:", error);
    }
  }
}

function getRoomId() {
  const url = new URL(location.href);
  return url.searchParams.get("room") || "default";
}

function setTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");

  const btnTheme = document.getElementById("btnTheme");
  btnTheme.classList.toggle("is-active", isDark);
  btnTheme.setAttribute("aria-label", isDark ? "Enable light mode" : "Enable dark mode");
  btnTheme.setAttribute("title", isDark ? "Light" : "Dark");
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = saved ? saved === "dark" : prefersDark;

  setTheme(isDark);

  const btnTheme = document.getElementById("btnTheme");
  btnTheme.addEventListener("click", () => {
    setTheme(!document.body.classList.contains("dark"));
  });
}

function setSync(enabled) {
  syncEnabled = enabled;

  const btnSync = document.getElementById("btnSync");
  btnSync.classList.toggle("is-active", enabled);
  btnSync.setAttribute("aria-label", enabled ? "Disable sync" : "Enable sync");
  btnSync.setAttribute("title", enabled ? "Sync on" : "Sync off");
}

function initSync() {
  setSync(false);

  const btnSync = document.getElementById("btnSync");
  btnSync.addEventListener("click", () => {
    setSync(!syncEnabled);
  });
}

function initFaders() {
  const faders = document.querySelectorAll('input[type="range"]');

  faders.forEach((fader) => {
    const path = fader.dataset.path;

    const activate = () => {
      fader.classList.add("is-active");
    };

    const deactivate = () => {
      fader.classList.remove("is-active");
    };

    fader.addEventListener("pointerdown", activate);
    fader.addEventListener("pointerup", deactivate);
    fader.addEventListener("pointercancel", deactivate);
    fader.addEventListener("blur", deactivate);

    fader.addEventListener("input", () => {
      if (isApplyingRemoteUpdate) {
        return;
      }
      sendMessage(path, fader.value);
    });

    sendMessage(path, fader.value);
  });

  window.addEventListener("pointerup", () => {
    document
      .querySelectorAll('input[type="range"].is-active')
      .forEach((fader) => fader.classList.remove("is-active"));
  });
}

function applyRemoteFaderUpdate(path, value) {
  const fader = document.querySelector(`input[data-path="${CSS.escape(path)}"]`);
  if (!fader) {
    return;
  }

  const nextValue = Number(value);
  if (Number.isNaN(nextValue)) {
    return;
  }

  isApplyingRemoteUpdate = true;
  fader.value = String(nextValue);
  isApplyingRemoteUpdate = false;
}

function initBrokerMessageHandling() {
  onBrokerMessage((message) => {
    if (!syncEnabled) {
      return;
    }

    if (!message || message.type !== "osc" || !message.path || !Array.isArray(message.args)) {
      return;
    }

    const firstArg = message.args[0];
    if (!firstArg || typeof firstArg.v === "undefined") {
      return;
    }

    applyRemoteFaderUpdate(message.path, firstArg.v);
  });
}

function initButtons() {
  const btnShot = document.getElementById("btnShot");
  const btnVid = document.getElementById("btnVid");

  let recording = false;

  btnShot.addEventListener("click", () => {
    console.log("[ui] screenshot requested");
  });

  btnVid.addEventListener("click", () => {
    recording = !recording;
    btnVid.classList.toggle("is-active", recording);
    btnVid.setAttribute("aria-label", recording ? "Stop video" : "Start video");
    btnVid.setAttribute("title", recording ? "Stop video" : "Video");
    console.log(recording ? "[ui] start video" : "[ui] stop video");
  });
}

async function boot() {
  await registerSW();
  initTheme();
  initSync();
  initFaders();
  initButtons();
  initBrokerMessageHandling();
  connectToBroker(getRoomId());
}

boot();
