import { makeMediaFilename } from "./download-name.js";

export function createVideoOverlayController({
  overlay,
  panel,
  video,
  btnSave,
  btnShare,
  btnCancel,
}) {
  let videoUrl = null;
  let videoBlob = null;
  let videoName = "pixelor-video.webm";
  let videoArrivedAt = null;

  function cleanupObjectUrl() {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      videoUrl = null;
    }
  }

  function close() {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");

    video.pause();
    video.removeAttribute("src");
    video.load();

    cleanupObjectUrl();

    videoBlob = null;
    videoName = "pixelor-video.webm";
    videoArrivedAt = null;
  }

  function show(blob, header = {}) {
    cleanupObjectUrl();

    videoBlob = blob;
    videoArrivedAt = new Date();

    const mime = header.mime || blob.type || "video/webm";
    const ext = mime.includes("mp4") ? "mp4" : "webm";

    videoName = makeMediaFilename({
      prefix: "pixelor",
      kind: "video",
      extension: ext,
      arrivedAt: videoArrivedAt,
    });

    videoUrl = URL.createObjectURL(blob);

    video.src = videoUrl;
    video.load();

    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");

    console.log("[overlay] showing video", {
      name: videoName,
      size: blob.size,
      type: blob.type,
      width: header.width,
      height: header.height,
      durationMs: header.durationMs,
      arrivedAt: videoArrivedAt.toISOString(),
    });
  }

  function save() {
    if (!videoBlob || !videoUrl) {
      return;
    }

    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = videoName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function share() {
    if (!videoBlob) {
      return;
    }

    const file = new File([videoBlob], videoName, {
      type: videoBlob.type || "video/webm",
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: videoName,
        });
        return;
      } catch (err) {
        console.log("[share] cancelled or failed:", err);
        return;
      }
    }

    save();
  }

  function init() {
    btnSave.addEventListener("click", save);
    btnShare.addEventListener("click", share);
    btnCancel.addEventListener("click", close);

    overlay.addEventListener("click", close);
    panel.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    video.addEventListener("click", () => {
      if (video.paused) video.play();
      else video.pause();
    });
  }

  return {
    init,
    show,
    close,
  };
}
