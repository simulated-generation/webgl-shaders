export function handleBrokerMessage(message, {
  syncEnabled,
  applyRemoteFaderUpdate,
  showImageOverlay,
}) {
  if (!message) {
    return;
  }

  if (message.type === "image-binary") {
    const header = message.header || {};
    const blob = message.blob;

    if (!(blob instanceof Blob)) {
      console.log("[image] invalid blob payload");
      return;
    }

    const typedBlob = blob.type
      ? blob
      : new Blob([blob], { type: header.mime || "image/png" });

    showImageOverlay(typedBlob, header);
    return;
  }

  if (!syncEnabled()) {
    return;
  }

  if (message.type !== "osc" || !message.path || !Array.isArray(message.args)) {
    return;
  }

  const firstArg = message.args[0];
  if (!firstArg || typeof firstArg.v === "undefined") {
    return;
  }

  applyRemoteFaderUpdate(message.path, firstArg.v);
}
