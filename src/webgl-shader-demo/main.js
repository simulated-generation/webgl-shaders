import * as Renderer from "./core/renderer.js";
import { initSimulation, updateSimulation, getPoints } from "./core/simulation.js";
import { updateTime } from "./core/time.js";

async function main(){
  const canvas = document.getElementById("glcanvas");
  const [pointVS, pointFS, quadVS, quadFS] = await Promise.all([
    fetch("./shaders/point.vert").then(r=>r.text()),
    fetch("./shaders/point.frag").then(r=>r.text()),
    fetch("./shaders/quad.vert").then(r=>r.text()),
    fetch("./shaders/quad.frag").then(r=>r.text()),
  ]);

  Renderer.initRenderer(canvas, pointVS, pointFS, quadVS, quadFS);
  initSimulation();

  window.addEventListener("resize", ()=> Renderer.resize(canvas));

  function loop(){
    const { steps, dt, now } = updateTime();
    for(let i=0;i<steps;i++) updateSimulation(dt);
    const points = getPoints(); // Float32Array or array of floats
    // pass options: decay and point size
    Renderer.drawFrame(points, now, { decay: 0.95, pointSize: 4.0, scale: 2.0 });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
main();

