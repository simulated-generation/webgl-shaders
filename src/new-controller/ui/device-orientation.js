function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wrapPi(angleRad) {
  let a = angleRad;
  while (a <= -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}

function angleRadToUnit(angleRad) {
  return (wrapPi(angleRad) + Math.PI) / (Math.PI * 2);
}

function quatNormalize([x, y, z, w]) {
  const len = Math.hypot(x, y, z, w) || 1;
  return [x / len, y / len, z / len, w / len];
}

function quatConjugate([x, y, z, w]) {
  return [-x, -y, -z, w];
}

function quatMultiply(a, b) {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;

  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function quatFromAxisAngle(axis, angleRad) {
  const [ax, ay, az] = axis;
  const half = angleRad * 0.5;
  const s = Math.sin(half);
  return [ax * s, ay * s, az * s, Math.cos(half)];
}

/*
  DeviceOrientationEvent gives intrinsic Z-X'-Y'' angles:
  alpha about Z, beta about X, gamma about Y.
*/
function quatFromDeviceOrientation(alphaDeg, betaDeg, gammaDeg) {
  const alpha = (alphaDeg || 0) * Math.PI / 180;
  const beta = (betaDeg || 0) * Math.PI / 180;
  const gamma = (gammaDeg || 0) * Math.PI / 180;

  const qz = quatFromAxisAngle([0, 0, 1], alpha);
  const qx = quatFromAxisAngle([1, 0, 0], beta);
  const qy = quatFromAxisAngle([0, 1, 0], gamma);

  return quatNormalize(quatMultiply(quatMultiply(qz, qx), qy));
}

function getQuaternionFromSensor(sensor) {
  if (!sensor?.quaternion || sensor.quaternion.length !== 4) {
    return null;
  }

  return quatNormalize(Array.from(sensor.quaternion));
}

/*
  Extract signed twist angle around a given local axis from quaternion q.
  axis must be normalized and expressed in the calibrated local frame.
*/
function extractTwistAngle(q, axis) {
  const nq = quatNormalize(q);
  const [ax, ay, az] = axis;

  const projected = nq[0] * ax + nq[1] * ay + nq[2] * az;
  let twist = [ax * projected, ay * projected, az * projected, nq[3]];

  const len = Math.hypot(twist[0], twist[1], twist[2], twist[3]);
  if (len < 1e-8) {
    return 0;
  }

  twist = twist.map((v) => v / len);

  const vecMag = Math.hypot(twist[0], twist[1], twist[2]);
  let angle = 2 * Math.atan2(vecMag, twist[3]);

  if (projected < 0) {
    angle = -angle;
  }

  return wrapPi(angle);
}

async function requestDeviceOrientationPermissionIfNeeded() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    const result = await DeviceOrientationEvent.requestPermission();
    return result === "granted";
  }

  return true;
}

export function createDeviceOrientationController({
  button,
  sendValue,
  pathX = "/virtualctl/O001",
  pathY = "/virtualctl/O002",
  pathZ = "/virtualctl/O003",
  frequency = 30,
} = {}) {
  let enabled = false;
  let baselineQuat = null;

  let relativeSensor = null;
  let deviceOrientationHandler = null;
  let source = null; // "relative-sensor" | "deviceorientation" | null

  function sendNeutral() {
    sendValue(pathX, 0.5);
    sendValue(pathY, 0.5);
    sendValue(pathZ, 0.5);
  }

  function setButtonState(active) {
    enabled = active;
    button?.classList.toggle("is-active", active);
    button?.setAttribute(
      "aria-label",
      active ? "Disable device orientation" : "Enable device orientation"
    );
    button?.setAttribute(
      "title",
      active ? "Orientation on" : "Orientation"
    );
  }

  function applyQuaternion(currentQuat) {
    if (!currentQuat) {
      return;
    }

    if (!baselineQuat) {
      baselineQuat = currentQuat;
      sendNeutral();
      console.log("[orientation] calibrated");
      return;
    }

    const deltaQuat = quatMultiply(quatConjugate(baselineQuat), currentQuat);

    const angleX = extractTwistAngle(deltaQuat, [1, 0, 0]);
    const angleY = extractTwistAngle(deltaQuat, [0, 1, 0]);
    const angleZ = extractTwistAngle(deltaQuat, [0, 0, 1]);

    const x01 = angleRadToUnit(angleX);
    const y01 = angleRadToUnit(angleY);
    const z01 = angleRadToUnit(angleZ);

    sendValue(pathX, x01);
    sendValue(pathY, y01);
    sendValue(pathZ, z01);
  }

  function stopRelativeSensor() {
    if (!relativeSensor) {
      return;
    }

    try {
      relativeSensor.stop();
    } catch (_) {
      // ignore
    }

    relativeSensor = null;
  }

  function stopDeviceOrientationFallback() {
    if (!deviceOrientationHandler) {
      return;
    }

    window.removeEventListener("deviceorientation", deviceOrientationHandler);
    deviceOrientationHandler = null;
  }

  function stop() {
    stopRelativeSensor();
    stopDeviceOrientationFallback();

    source = null;
    baselineQuat = null;
    setButtonState(false);
    //sendNeutral();

    console.log("[orientation] stopped");
  }

  function startRelativeSensor() {
    relativeSensor = new RelativeOrientationSensor({
      frequency,
      referenceFrame: "device",
    });

    relativeSensor.addEventListener("reading", () => {
      const q = getQuaternionFromSensor(relativeSensor);
      applyQuaternion(q);
    });

    relativeSensor.addEventListener("error", (event) => {
      console.log("[orientation] sensor error:", event.error?.name || event);
      stop();
    });

    relativeSensor.start();
    source = "relative-sensor";
    baselineQuat = null;
    setButtonState(true);

    console.log("[orientation] started with RelativeOrientationSensor");
  }

  async function startDeviceOrientationFallback() {
    const granted = await requestDeviceOrientationPermissionIfNeeded();
    if (!granted) {
      console.log("[orientation] deviceorientation permission denied");
      stop();
      return;
    }

    deviceOrientationHandler = (event) => {
      if (
        event.alpha == null ||
        event.beta == null ||
        event.gamma == null
      ) {
        return;
      }

      const q = quatFromDeviceOrientation(event.alpha, event.beta, event.gamma);
      applyQuaternion(q);
    };

    window.addEventListener("deviceorientation", deviceOrientationHandler, {
      passive: true,
    });

    source = "deviceorientation";
    baselineQuat = null;
    setButtonState(true);

    console.log("[orientation] started with DeviceOrientationEvent fallback");
  }

  async function start() {
    try {
      if ("RelativeOrientationSensor" in window) {
        startRelativeSensor();
        return;
      }

      if ("DeviceOrientationEvent" in window) {
        await startDeviceOrientationFallback();
        return;
      }

      console.log("[orientation] no supported orientation API found");
      stop();
    } catch (error) {
      console.log("[orientation] failed to start:", error);
      stop();
    }
  }

  async function toggle() {
    if (enabled) {
      stop();
      return;
    }

    await start();
  }

  function recalibrate() {
    baselineQuat = null;
    sendNeutral();
    console.log("[orientation] recalibration requested");
  }

  function init() {
    button?.addEventListener("click", toggle);
    button?.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (enabled) {
        recalibrate();
      }
    });

    sendNeutral();
  }

  return {
    init,
    stop,
    recalibrate,
    isEnabled: () => enabled,
    getSource: () => source,
  };
}
