export function createFadersController({ root, sendValue }) {
  let isApplyingRemoteUpdate = false;

  function applyRemoteFaderUpdate(path, value) {
    const fader = root.querySelector(`input[data-path="${CSS.escape(path)}"]`);
    if (!fader) {
      return;
    }

    const nextValue = Number(value);
    if (Number.isNaN(nextValue)) {
      return;
    }

    isApplyingRemoteUpdate = true;
    fader.value = String(nextValue);
    isApplyingRemoteUpdate = false;
  }

  function init() {
    const faders = root.querySelectorAll('input[type="range"]');

    faders.forEach((fader) => {
      const path = fader.dataset.path;

      const activate = () => {
        fader.classList.add("is-active");
      };

      const deactivate = () => {
        fader.classList.remove("is-active");
      };

      fader.addEventListener("pointerdown", activate);
      fader.addEventListener("pointerup", deactivate);
      fader.addEventListener("pointercancel", deactivate);
      fader.addEventListener("blur", deactivate);

      fader.addEventListener("input", () => {
        if (isApplyingRemoteUpdate) {
          return;
        }
        sendValue(path, fader.value);
      });

      sendValue(path, fader.value);
    });

    window.addEventListener("pointerup", () => {
      root
        .querySelectorAll('input[type="range"].is-active')
        .forEach((fader) => fader.classList.remove("is-active"));
    });
  }

  return {
    init,
    applyRemoteUpdate: applyRemoteFaderUpdate,
  };
}
