export function createShotButtonController({ button, sendPictureRequest, timeoutMs = 8000 }) {
  let pending = false;
  let timer = null;

  function setPending(next) {
    pending = !!next;
    button.classList.toggle("is-pending", pending);
    button.disabled = pending;
    button.setAttribute("aria-busy", pending ? "true" : "false");
    button.setAttribute("title", pending ? "Waiting for screenshot" : "Screenshot");
  }

  function clearPending() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    setPending(false);
  }

  function init() {
    button.addEventListener("click", () => {
      if (pending) {
        return;
      }

      console.log("[ui] screenshot requested");
      setPending(true);
      sendPictureRequest();

      timer = setTimeout(() => {
        console.log("[ui] screenshot wait timeout");
        clearPending();
      }, timeoutMs);
    });
  }

  return {
    init,
    clearPending,
    isPending: () => pending,
  };
}
