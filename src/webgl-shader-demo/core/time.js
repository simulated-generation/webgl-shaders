let lastTime = 0;
let accumulator = 0;
const FIXED_DT = 1 / 120; // simulation step in seconds

export function getTime() {
  return performance.now() / 1000;
}

export function updateTime() {
  const now = getTime();
  const delta = Math.min(0.1, now - lastTime);
  lastTime = now;
  accumulator += delta;
  const steps = Math.floor(accumulator / FIXED_DT);
  accumulator -= steps * FIXED_DT;
  return { steps, dt: FIXED_DT, now };
}

