function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSymmetric(angleRad, maxAbsRad) {
  const clamped = clamp(angleRad, -maxAbsRad, maxAbsRad);
  return (clamped / maxAbsRad + 1) * 0.5;
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

/*
  Extract intrinsic Euler angles in YXZ order from quaternion.
  We only care about y and z for now.
*/
function quatToEulerYXZ(q) {
  const [x, y, z, w] = quatNormalize(q);

  const m11 = 1 - 2 * (y * y + z * z);
  const m12 = 2 * (x * y - z * w);
  const m13 = 2 * (x * z + y * w);

  const m21 = 2 * (x * y + z * w);
  const m22 = 1 - 2 * (x * x + z * z);
  const m23 = 2 * (y * z - x * w);

  const m33 = 1 - 2 * (x * x + y * y);

  const clampM23 = clamp(m23, -1, 1);

  const xAngle = Math.asin(-clampM23);

  let yAngle;
  let zAngle;

  if (Math.abs(m23) < 0.9999999) {
    yAngle = Math.atan2(m13, m33);
    zAngle = Math.atan2(m21, m22);
  } else {
    yAngle = Math.atan2(-m31FromQuat(x, y, z, w), m11);
    zAngle = 0;
  }

  return {
    x: xAngle,
    y: yAngle,
    z: zAngle,
  };
}

function m31FromQuat(x, y, z, w) {
  return 2 * (x * z - y * w);
}

function getQuaternionFromSensor(sensor) {
  if (!sensor?.quaternion || sensor.quaternion.length !== 4) {
    return null;
  }

  return quatNormalize(Array.from(sensor.quaternion));
}

export function createDeviceOrientationController({
  button,
  sendValue,
  pathY = "/virtualctl/O001",
  pathZ = "/virtualctl/O002",
  frequency = 30,
  yRangeDeg = 45,
  zRangeDeg = 90,
} = {}) {
  let enabled = false;
  let sensor = null;
  let baselineQuat = null;

  const yRangeRad = (yRangeDeg * Math.PI) / 180;
  const zRangeRad = (zRangeDeg * Math.PI) / 180;

  function sendNeutral() {
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

  function stop() {
    if (sensor) {
      try {
        sensor.stop();
      } catch (_) {
        // ignore
      }
    }

    sensor = null;
    baselineQuat = null;
    setButtonState(false);
    sendNeutral();
    console.log("[orientation] stopped");
  }

  function onReading() {
    const currentQuat = getQuaternionFromSensor(sensor);
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
    const euler = quatToEulerYXZ(deltaQuat);

    const y01 = normalizeSymmetric(euler.y, yRangeRad);
    const z01 = normalizeSymmetric(euler.z, zRangeRad);

    sendValue(pathY, y01);
    sendValue(pathZ, z01);
  }

  function onError(event) {
    console.log("[orientation] sensor error:", event.error?.name || event);
    stop();
  }

  async function start() {
    if (!("RelativeOrientationSensor" in window)) {
      console.log("[orientation] RelativeOrientationSensor not supported");
      return;
    }

    try {
      sensor = new RelativeOrientationSensor({
        frequency,
        referenceFrame: "device",
      });

      sensor.addEventListener("reading", onReading);
      sensor.addEventListener("error", onError);

      baselineQuat = null;
      sensor.start();
      setButtonState(true);

      console.log("[orientation] started");
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

  function init() {
    button?.addEventListener("click", toggle);
    sendNeutral();
  }

  return {
    init,
    stop,
    isEnabled: () => enabled,
  };
}
