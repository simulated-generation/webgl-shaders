function pulseButton(button) {
  if (!button) {
    return;
  }

  button.classList.remove("is-pressed");

  void button.offsetWidth;

  button.classList.add("is-pressed");

  window.setTimeout(() => {
    button.classList.remove("is-pressed");
  }, 260);
}

export function createButtonPulseController({
  root = document,
  selector = ".btn",
} = {}) {
  let buttons = [];
  let disposers = [];

  function init() {
    buttons = Array.from(root.querySelectorAll(selector));
    disposers = [];

    for (const button of buttons) {
      const onPointerDown = () => {
        pulseButton(button);
      };

      button.addEventListener("pointerdown", onPointerDown, { passive: true });

      disposers.push(() => {
        button.removeEventListener("pointerdown", onPointerDown);
      });
    }
  }

  function destroy() {
    for (const dispose of disposers) {
      dispose();
    }

    disposers = [];
    buttons = [];
  }

  return {
    init,
    destroy,
    pulse: pulseButton,
  };
}
