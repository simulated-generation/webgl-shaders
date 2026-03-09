function getOrientationAngle() {
  if (screen.orientation && typeof screen.orientation.angle === "number") {
    return screen.orientation.angle;
  }

  if (typeof window.orientation === "number") {
    return window.orientation;
  }

  return 0;
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

export function createOrientationController({ body = document.body } = {}) {
  let bound = false;
  let onScreenOrientationChange = null;
  let onWindowOrientationChange = null;
  let onResize = null;

  function applyOrientationState() {
    const angle = normalizeAngle(getOrientationAngle());

    body.classList.remove(
      "orientation-portrait",
      "orientation-left",
      "orientation-right",
      "orientation-upside-down",
      "is-landscape"
    );

    let iconRotation = "0deg";
    let overlayRotation = "0deg";

    if (angle === 90) {
      body.classList.add("orientation-right", "is-landscape");
      iconRotation = "90deg";
      overlayRotation = "90deg";
    } else if (angle === 270) {
      body.classList.add("orientation-left", "is-landscape");
      iconRotation = "-90deg";
      overlayRotation = "-90deg";
    } else if (angle === 180) {
      body.classList.add("orientation-upside-down");
      iconRotation = "180deg";
      overlayRotation = "0deg";
    } else {
      body.classList.add("orientation-portrait");
      iconRotation = "0deg";
      overlayRotation = "0deg";
    }

    document.documentElement.style.setProperty("--device-rotation", iconRotation);
    document.documentElement.style.setProperty("--overlay-rotation", overlayRotation);
  }

  function init() {
    if (bound) {
      return;
    }

    bound = true;
    applyOrientationState();

    onScreenOrientationChange = () => {
      applyOrientationState();
    };

    onWindowOrientationChange = () => {
      applyOrientationState();
    };

    onResize = () => {
      applyOrientationState();
    };

    if (
      screen.orientation &&
      typeof screen.orientation.addEventListener === "function"
    ) {
      screen.orientation.addEventListener("change", onScreenOrientationChange);
    }

    window.addEventListener("orientationchange", onWindowOrientationChange);
    window.addEventListener("resize", onResize);
  }

  function destroy() {
    if (!bound) {
      return;
    }

    bound = false;

    if (
      screen.orientation &&
      typeof screen.orientation.removeEventListener === "function" &&
      onScreenOrientationChange
    ) {
      screen.orientation.removeEventListener("change", onScreenOrientationChange);
    }

    if (onWindowOrientationChange) {
      window.removeEventListener("orientationchange", onWindowOrientationChange);
    }

    if (onResize) {
      window.removeEventListener("resize", onResize);
    }

    onScreenOrientationChange = null;
    onWindowOrientationChange = null;
    onResize = null;
  }

  return {
    init,
    destroy,
    apply: applyOrientationState,
  };
}
