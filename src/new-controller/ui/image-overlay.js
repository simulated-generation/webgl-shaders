export function createImageOverlayController({
  overlay,
  panel,
  image,
  btnSave,
  btnShare,
  btnCancel,
}) {
  let imageUrl = null;
  let imageBlob = null;
  let imageName = "capture.png";

  function cleanupObjectUrl() {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      imageUrl = null;
    }
  }

  function close() {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    image.removeAttribute("src");

    cleanupObjectUrl();

    imageBlob = null;
    imageName = "capture.png";
  }

  function show(blob, header = {}) {
    cleanupObjectUrl();

    imageBlob = blob;
    imageName = `capture-${header.seq || Date.now()}.png`;
    imageUrl = URL.createObjectURL(blob);

    image.src = imageUrl;
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");

    console.log("[overlay] showing image", {
      name: imageName,
      size: blob.size,
      type: blob.type,
      width: header.width,
      height: header.height,
    });
  }

  function save() {
    if (!imageBlob || !imageUrl) {
      return;
    }

    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = imageName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function share() {
    if (!imageBlob) {
      return;
    }

    const file = new File([imageBlob], imageName, {
      type: imageBlob.type || "image/png",
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: imageName,
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
  }

  return {
    init,
    show,
    close,
  };
}
