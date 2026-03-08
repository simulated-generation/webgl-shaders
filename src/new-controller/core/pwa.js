export async function registerSW() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
    console.log("[pwa] service worker registered");
  } catch (error) {
    console.log("[pwa] service worker registration failed:", error);
  }
}
