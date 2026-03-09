export function createInfoOverlayController({
    overlay,
    btnOpen,
    btnClose,
} = {}) {
    function show() {
          if (!overlay) {
                  return;
                }

          overlay.classList.remove("hidden");
          overlay.setAttribute("aria-hidden", "false");
        }

    function hide() {
          if (!overlay) {
                  return;
                }

          overlay.classList.add("hidden");
          overlay.setAttribute("aria-hidden", "true");
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
          btnOpen?.addEventListener("click", show);
          btnClose?.addEventListener("click", hide);
          overlay?.addEventListener("click", onOverlayClick);
          document.addEventListener("keydown", onKeyDown);
        }

    return {
          init,
          show,
          hide,
        };
}
