export function createVideoButtonController({
  button,
  sendVideoRequest,
  timeoutMs = 60000,
}) {
  let pending = false;
  let timer = null;

  function setPending(next) {
    pending = !!next;
    button.classList.toggle("is-pending", pending);
    button.disabled = pending;
    button.setAttribute("aria-busy", pending ? "true" : "false");
    button.setAttribute("aria-label", pending ? "Recording video" : "Start video");
    button.setAttribute("title", pending ? "Recording video" : "Video");
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

      console.log("[ui] video requested");
      setPending(true);
      sendVideoRequest();

      timer = setTimeout(() => {
        console.log("[ui] video wait timeout");
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
