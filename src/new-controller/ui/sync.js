export function createSyncController({ button }) {
  let enabled = false;

  function setEnabled(next) {
    enabled = !!next;
    button.classList.toggle("is-active", enabled);
    button.setAttribute("aria-label", enabled ? "Disable sync" : "Enable sync");
    button.setAttribute("title", enabled ? "Sync on" : "Sync off");
  }

  function isEnabled() {
    return enabled;
  }

  function init() {
    setEnabled(false);
    button.addEventListener("click", () => {
      setEnabled(!enabled);
    });
  }

  return {
    init,
    isEnabled,
    setEnabled,
  };
}
