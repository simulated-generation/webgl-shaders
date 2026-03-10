import { connectToBroker, onBrokerMessage, sendMessage } from "./lib/ws-client.js";
import { registerSW } from "./core/pwa.js";
import { getRoomId } from "./core/room.js";
import { createThemeController } from "./ui/theme.js";
import { createSyncController } from "./ui/sync.js";
import { createFadersController } from "./ui/faders.js";
import { createShotButtonController } from "./ui/shot-button.js";
import { createVideoButtonController } from "./ui/video-button.js";
import { createImageOverlayController } from "./ui/image-overlay.js";
import { createVideoOverlayController } from "./ui/video-overlay.js";
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

  const videoOverlay = createVideoOverlayController({
    overlay: document.getElementById("videoOverlay"),
    panel: document.getElementById("videoOverlayPanel"),
    video: document.getElementById("overlayVideo"),
    btnSave: document.getElementById("btnVideoSave"),
    btnShare: document.getElementById("btnVideoShare"),
    btnCancel: document.getElementById("btnVideoCancel"),
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

  const videoButton = createVideoButtonController({
    button: document.getElementById("btnVid"),
    sendVideoRequest: () => sendMessage("/virtualctl/video", 1),
  });

  onBrokerMessage((message) => {
    handleBrokerMessage(message, {
      syncEnabled: () => sync.isEnabled(),
      applyRemoteFaderUpdate: (path, value) => faders.applyRemoteUpdate(path, value),
      showImageOverlay: (blob, header) => {
        shot.clearPending();
        overlay.show(blob, header);
      },
      showVideoOverlay: (blob, header) => {
        videoButton.clearPending();
        videoOverlay.show(blob, header);
      },
    });
  });

  theme.init();
  sync.init();
  orientation.init();
  buttonPulse.init();
  faders.init();
  shot.init();
  videoButton.init();
  overlay.init();
  videoOverlay.init();
  infoOverlay.init();

  connectToBroker(getRoomId());
}

boot();
