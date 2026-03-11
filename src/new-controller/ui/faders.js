export function createFadersController({ root, sendValue }) {
  let isApplyingRemoteUpdate = false;

  const pointerStates = new Map();
  let faders = [];
  let rows = [];
  let surface = null;
  let activeCounts = [];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getNumericAttr(el, name, fallback) {
    const value = Number(el.getAttribute(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function quantizeToStep(value, min, step) {
    if (!Number.isFinite(step) || step <= 0) {
      return value;
    }

    const steps = Math.round((value - min) / step);
    return min + steps * step;
  }

  function getFaderConfig(fader) {
    const min = getNumericAttr(fader, "min", 0);
    const max = getNumericAttr(fader, "max", 100);
    const step = getNumericAttr(fader, "step", 0);

    return { min, max, step };
  }

  function setFaderActive(index, isActive) {
    const fader = faders[index];
    if (!fader) {
      return;
    }

    fader.classList.toggle("is-active", isActive);
  }

  function incrementFaderActivity(index) {
    activeCounts[index] = (activeCounts[index] || 0) + 1;
    setFaderActive(index, true);
  }

  function decrementFaderActivity(index) {
    activeCounts[index] = Math.max(0, (activeCounts[index] || 0) - 1);
    if (activeCounts[index] === 0) {
      setFaderActive(index, false);
    }
  }

  function setFaderValue(index, nextValue, { emit = true } = {}) {
    const fader = faders[index];
    if (!fader) {
      return;
    }

    const { min, max, step } = getFaderConfig(fader);

    let value = clamp(nextValue, min, max);
    value = quantizeToStep(value, min, step);

    const currentValue = Number(fader.value);
    if (Math.abs(currentValue - value) < 1e-9) {
      return;
    }

    fader.value = String(value);

    if (!emit || isApplyingRemoteUpdate) {
      return;
    }

    sendValue(fader.dataset.path, fader.value);
  }

  function applyRemoteFaderUpdate(path, value) {
    const index = faders.findIndex((fader) => fader.dataset.path === path);
    if (index === -1) {
      return;
    }

    if ((activeCounts[index] || 0) > 0) {
      return;
    }

    const nextValue = Number(value);
    if (Number.isNaN(nextValue)) {
      return;
    }

    isApplyingRemoteUpdate = true;
    setFaderValue(index, nextValue, { emit: false });
    isApplyingRemoteUpdate = false;
  }

  function getRowCenters() {
    return rows.map((row) => {
      const rect = row.getBoundingClientRect();
      return (rect.top + rect.bottom) * 0.5;
    });
  }

  function getTargetIndicesForY(clientY) {
    const centers = getRowCenters();

    if (centers.length === 0) {
      return [];
    }

    if (centers.length === 1) {
      return [0];
    }

    for (let i = 0; i < centers.length - 1; i += 1) {
      const a = centers[i];
      const b = centers[i + 1];
      const midpoint = (a + b) * 0.5;
      const spacing = b - a;

      const dualZoneHalfSize = spacing * 0.18;

      if (Math.abs(clientY - midpoint) <= dualZoneHalfSize) {
        return [i, i + 1];
      }
    }

    let nearestIndex = 0;
    let nearestDistance = Math.abs(clientY - centers[0]);

    for (let i = 1; i < centers.length; i += 1) {
      const distance = Math.abs(clientY - centers[i]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    return [nearestIndex];
  }

  function getTrackWidth(index) {
    const fader = faders[index];
    if (!fader) {
      return 1;
    }

    const rect = fader.getBoundingClientRect();
    return Math.max(1, rect.width);
  }

  function makeTargetAnchor(index, clientX) {
    return {
      index,
      startX: clientX,
      startValue: Number(faders[index].value),
      trackWidth: getTrackWidth(index),
    };
  }

  function releasePointerTargets(state) {
    for (const target of state.targets.values()) {
      decrementFaderActivity(target.index);
    }
    state.targets.clear();
  }

  function retargetPointer(state, clientX, clientY) {
    const nextIndices = getTargetIndicesForY(clientY);
    const nextSet = new Set(nextIndices);

    for (const [index] of state.targets) {
      if (!nextSet.has(index)) {
        decrementFaderActivity(index);
        state.targets.delete(index);
      }
    }

    for (const index of nextIndices) {
      if (!state.targets.has(index)) {
        state.targets.set(index, makeTargetAnchor(index, clientX));
        incrementFaderActivity(index);
      }
    }
  }

  function updatePointerTargets(state, clientX) {
    for (const target of state.targets.values()) {
      const fader = faders[target.index];
      if (!fader) {
        continue;
      }

      const { min, max } = getFaderConfig(fader);
      const range = max - min;
      const deltaRatio = (clientX - target.startX) / target.trackWidth;
      const nextValue = target.startValue + deltaRatio * range;

      setFaderValue(target.index, nextValue, { emit: true });
    }
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    if (!surface) {
      return;
    }

    event.preventDefault();

    surface.setPointerCapture(event.pointerId);

    const state = {
      pointerId: event.pointerId,
      targets: new Map(),
    };

    pointerStates.set(event.pointerId, state);

    retargetPointer(state, event.clientX, event.clientY);
    updatePointerTargets(state, event.clientX);
  }

  function onPointerMove(event) {
    const state = pointerStates.get(event.pointerId);
    if (!state) {
      return;
    }

    event.preventDefault();

    retargetPointer(state, event.clientX, event.clientY);
    updatePointerTargets(state, event.clientX);
  }

  function endPointer(pointerId) {
    const state = pointerStates.get(pointerId);
    if (!state) {
      return;
    }

    releasePointerTargets(state);
    pointerStates.delete(pointerId);
  }

  function onPointerUp(event) {
    endPointer(event.pointerId);
  }

  function onPointerCancel(event) {
    endPointer(event.pointerId);
  }

  function onLostPointerCapture(event) {
    endPointer(event.pointerId);
  }

  function init() {
    surface = root.querySelector(".faders");
    faders = Array.from(root.querySelectorAll('.faders input[type="range"]'));
    rows = Array.from(root.querySelectorAll(".fader-row"));
    activeCounts = new Array(faders.length).fill(0);

    if (!surface || faders.length === 0 || rows.length !== faders.length) {
      console.warn("[faders] missing .faders surface or mismatched rows/inputs");
      return;
    }

    surface.addEventListener("pointerdown", onPointerDown);
    surface.addEventListener("pointermove", onPointerMove);
    surface.addEventListener("pointerup", onPointerUp);
    surface.addEventListener("pointercancel", onPointerCancel);
    surface.addEventListener("lostpointercapture", onLostPointerCapture);

    for (const fader of faders) {
      sendValue(fader.dataset.path, fader.value);
    }
  }

  return {
    init,
    applyRemoteUpdate: applyRemoteFaderUpdate,
  };
}
