import { makeMediaFilename } from "./download-name.js";

export function createImageOverlayController({
  overlay,
  panel,
  image,
  btnSave,
  btnShare,
  btnCancel,
} = {}) {
  let currentBlob = null;
  let currentHeader = null;
  let currentArrivedAt = null;

  function getExtensionFromBlob(blob) {
    const type = blob?.type || "";

    if (type === "image/png") return "png";
    if (type === "image/jpeg") return "jpg";
    if (type === "image/webp") return "webp";
    if (type === "image/gif") return "gif";
    if (type === "video/webm") return "webm";
    if (type === "video/mp4") return "mp4";

    if (type.startsWith("image/")) {
      return type.slice("image/".length);
    }

    if (type.startsWith("video/")) {
      return type.slice("video/".length);
    }

    return "bin";
  }

  function getKindFromBlob(blob) {
    const type = blob?.type || "";

    if (type.startsWith("video/")) {
      return "video";
    }

    return "image";
  }

  function show(blob, header) {
    if (!overlay || !image || !blob) {
      return;
    }

    currentBlob = blob;
    currentHeader = header || null;
    currentArrivedAt = new Date();

    const objectUrl = URL.createObjectURL(blob);
    image.src = objectUrl;

    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
  }

  function hide() {
    if (!overlay) {
      return;
    }

    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");

    if (image?.src?.startsWith("blob:")) {
      URL.revokeObjectURL(image.src);
    }

    if (image) {
      image.removeAttribute("src");
    }

    currentBlob = null;
    currentHeader = null;
    currentArrivedAt = null;
  }

  function save() {
    if (!currentBlob) {
      return;
    }

    const extension = getExtensionFromBlob(currentBlob);
    const kind = getKindFromBlob(currentBlob);

    const filename = makeMediaFilename({
      prefix: "pixelor",
      kind,
      extension,
      arrivedAt: currentArrivedAt || new Date(),
    });

    const url = URL.createObjectURL(currentBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    console.log("[overlay] saved:", filename);
  }

  async function share() {
    if (!currentBlob) {
      return;
    }

    const extension = getExtensionFromBlob(currentBlob);
    const kind = getKindFromBlob(currentBlob);

    const filename = makeMediaFilename({
      prefix: "pixelor",
      kind,
      extension,
      arrivedAt: currentArrivedAt || new Date(),
    });

    const file = new File([currentBlob], filename, {
      type: currentBlob.type || "application/octet-stream",
    });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
        });
      } catch (error) {
        console.log("[overlay] share cancelled or failed:", error);
      }
      return;
    }

    console.log("[overlay] share not supported");
  }

  function onOverlayClick(event) {
    if (event.target === overlay) {
      hide();
    }
  }

  function onKeyDown(event) {
    if (event.key === "Escape" && !overlay.classList.contains("hidden")) {
      hide();
    }
  }

  function init() {
    btnSave?.addEventListener("click", save);
    btnShare?.addEventListener("click", share);
    btnCancel?.addEventListener("click", hide);
    overlay?.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKeyDown);
  }

  return {
    init,
    show,
    hide,
  };
}
