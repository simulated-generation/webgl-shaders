import { connectToBroker, sendMessage } from "./lib/ws-client.js";

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

function initFaders() {
  const faders = document.querySelectorAll('input[type="range"]');

  faders.forEach((fader) => {
    const path = fader.dataset.path;

    fader.addEventListener("input", () => {
      sendMessage(path, fader.value);
    });

    sendMessage(path, fader.value);
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
    btnVid.classList.toggle("is-recording", recording);
    btnVid.setAttribute("aria-label", recording ? "Stop video" : "Start video");
    btnVid.setAttribute("title", recording ? "Stop video" : "Video");
    console.log(recording ? "[ui] start video" : "[ui] stop video");
  });
}

async function boot() {
  await registerSW();
  connectToBroker(getRoomId());
  initFaders();
  initButtons();
}

boot();
