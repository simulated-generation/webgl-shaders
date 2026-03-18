export function createWakeLockController({
  enabled = true,
} = {}) {
  let sentinel = null;
  let started = false;
  let visibilityHandler = null;

  async function acquire() {
    if (!enabled) {
      return false;
    }

    if (!("wakeLock" in navigator)) {
      console.log("[wake-lock] not supported");
      return false;
    }

    if (document.visibilityState !== "visible") {
      return false;
    }

    try {
      sentinel = await navigator.wakeLock.request("screen");

      sentinel.addEventListener("release", () => {
        console.log("[wake-lock] released");
        sentinel = null;
      });

      console.log("[wake-lock] acquired");
      return true;
    } catch (error) {
      console.log("[wake-lock] failed:", error);
      sentinel = null;
      return false;
    }
  }

  async function release() {
    if (!sentinel) {
      return;
    }

    try {
      await sentinel.release();
    } catch (_) {
      // ignore
    }

    sentinel = null;
  }

  async function refresh() {
    if (!enabled) {
      return;
    }

    if (document.visibilityState !== "visible") {
      return;
    }

    if (!sentinel) {
      await acquire();
    }
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);

    if (!enabled) {
      release();
      return;
    }

    refresh();
  }

  function init() {
    if (started) {
      return;
    }

    started = true;

    visibilityHandler = async () => {
      if (document.visibilityState === "visible") {
        await refresh();
      }
    };

    document.addEventListener("visibilitychange", visibilityHandler);
    refresh();
  }

  function destroy() {
    if (!started) {
      return;
    }

    started = false;

    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }

    release();
  }

  return {
    init,
    destroy,
    acquire,
    release,
    refresh,
    setEnabled,
    isSupported: () => "wakeLock" in navigator,
    isActive: () => sentinel !== null,
  };
}
