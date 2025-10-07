import { initRenderer, drawFrame, resize } from "./core/renderer.js";
import { updateTime } from "./core/time.js";
import { initSimulation, updateSimulation, getPoints } from "./core/simulation.js";

async function main() {
  const canvas = document.getElementById("glcanvas");

  const vsSource = await fetch("./shaders/vertex.glsl").then(r => r.text());
  const fsSource = await fetch("./shaders/fragment.glsl").then(r => r.text());

  initRenderer(canvas, vsSource, fsSource);
  initSimulation();

  window.addEventListener("resize", () => resize(canvas));

  function frame() {
    const { steps, dt, now } = updateTime();
    for (let i = 0; i < steps; i++) updateSimulation(dt);
    drawFrame(getPoints(), now);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main();

