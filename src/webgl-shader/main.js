import * as Renderer from "./core/renderer.js";
import { initSimulation, updateSimulation, getPoints } from "./core/simulation.js";
import { updateTime } from "./core/time.js";
import { connectBroker } from "./core/websocket-client.js";
import { getControl } from './core/state.js';


async function main(){
  const canvas = document.getElementById("glcanvas");
  const [pointVS, pointFS, quadVS, quadFS] = await Promise.all([
    fetch("./shaders/point.vert").then(r=>r.text()),
    fetch("./shaders/point.frag").then(r=>r.text()),
    fetch("./shaders/quad.vert").then(r=>r.text()),
    fetch("./shaders/quad.frag").then(r=>r.text()),
  ]);

  const id = new URLSearchParams(window.location.search).get("id") || "default";
  const broker = connectBroker({
    id,
    // url: "ws://localhost:8000/ws?id=" + encodeURIComponent(id), // optional override for dev
    onMessage: (msg) => {
      // For now, just log OSC-like messages in the browser console
      console.log("[OSC message]", msg);
      // Later: map msg.path / msg.args to shader uniforms
    },
    onOpen: () => console.log("[broker] open"),
    onClose: () => console.log("[broker] closed"),
    log: true
  });
  window._broker = broker;


  Renderer.initRenderer(canvas, pointVS, pointFS, quadVS, quadFS);
  initSimulation();

  window.addEventListener("resize", ()=> Renderer.resize(canvas));

  function loop(){
    const { steps, dt, now } = updateTime();
    for(let i=0;i<steps;i++) updateSimulation(dt);
    const points = getPoints(); // Float32Array or array of floats
    // pass options: decay and point size
    Renderer.drawFrame(points, now, { decay: 0.95+0.05*getControl('/virtualctl/K003'), pointSize: getControl('/virtualctl/K002') * 30.0, scale: 2.0 });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
main();

