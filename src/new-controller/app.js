import { connectToBroker, onBrokerMessage, sendMessage } from "./lib/ws-client.js";
import { registerSW } from "./core/pwa.js";
import { getRoomId } from "./core/room.js";
import { createThemeController } from "./ui/theme.js";
import { createSyncController } from "./ui/sync.js";
import { createFadersController } from "./ui/faders.js";
import { createShotButtonController } from "./ui/shot-button.js";
import { createImageOverlayController } from "./ui/image-overlay.js";
import { createInfoOverlayController } from "./ui/info-overlay.js";
import { createOrientationController } from "./ui/orientation.js";
import { createButtonPulseController } from "./ui/button-pulse.js";
import { handleBrokerMessage } from "./broker/messages.js";

async function boot() {
  await registerSW();

  const theme = createThemeController({
    body: document.body,
    button: document.getElementById("btnTheme"),
  });

  const sync = createSyncController({
    button: document.getElementById("btnSync"),
  });

  const orientation = createOrientationController({
    body: document.body,
  });

  const buttonPulse = createButtonPulseController({
    root: document,
    selector: ".btn",
  });

  const overlay = createImageOverlayController({
    overlay: document.getElementById("imageOverlay"),
    panel: document.getElementById("imageOverlayPanel"),
    image: document.getElementById("overlayImage"),
    btnSave: document.getElementById("btnOverlaySave"),
    btnShare: document.getElementById("btnOverlayShare"),
    btnCancel: document.getElementById("btnOverlayCancel"),
  });

  const infoOverlay = createInfoOverlayController({
    overlay: document.getElementById("infoOverlay"),
    btnOpen: document.getElementById("btnInfo"),
    btnClose: document.getElementById("btnInfoClose"),
  });

  const shot = createShotButtonController({
    button: document.getElementById("btnShot"),
    sendPictureRequest: () => sendMessage("/virtualctl/picture", 1),
  });

  const faders = createFadersController({
    root: document,
    sendValue: (path, value) => sendMessage(path, value),
  });

  const btnVid = document.getElementById("btnVid");
  let recording = false;

  btnVid.addEventListener("click", () => {
    recording = !recording;
    btnVid.classList.toggle("is-active", recording);
    btnVid.setAttribute("aria-label", recording ? "Stop video" : "Start video");
    btnVid.setAttribute("title", recording ? "Stop video" : "Video");
    console.log(recording ? "[ui] start video" : "[ui] stop video");
  });

  onBrokerMessage((message) => {
    handleBrokerMessage(message, {
      syncEnabled: () => sync.isEnabled(),
      applyRemoteFaderUpdate: (path, value) => faders.applyRemoteUpdate(path, value),
      showImageOverlay: (blob, header) => {
        shot.clearPending();
        overlay.show(blob, header);
      },
    });
  });

  theme.init();
  sync.init();
  orientation.init();
  buttonPulse.init();
  faders.init();
  shot.init();
  overlay.init();
  infoOverlay.init();

  connectToBroker(getRoomId());
}

boot();
