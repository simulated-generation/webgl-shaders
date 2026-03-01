import { updateTime } from "./core/time.js";
import { connectBroker } from "./core/websocket-client.js";
import { Simulation } from "./sim/sim.js";
import { ContentRenderer } from "./render/content.js";
import { SceneRenderer } from "./render/scene.js";
import { KeyboardCamera } from "./render/camera.js";

let _dbgT = 0;

async function loadText(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`fetch ${path} failed: ${r.status}`);
  return r.text();
}

function resizeCanvasToDisplaySize(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h };
}

async function main() {
  const canvas = document.getElementById("glcanvas");
  const gl = canvas.getContext("webgl2", { antialias: true });
  if (!gl) throw new Error("WebGL2 required");

  const id = new URLSearchParams(window.location.search).get("id") || "default";
  // non-fatal if broker absent
  connectBroker({ id, log: true });

  const [contentVS, contentFS, sceneVS, sceneFS] = await Promise.all([
    loadText("/shaders/content.vert"),
    loadText("/shaders/content.frag"),
    loadText("/shaders/scene.vert"),
    loadText("/shaders/scene.frag"),
  ]);

  const sim = new Simulation(400);

  const content = new ContentRenderer(gl, contentVS, contentFS, sim.N);
  const scene = new SceneRenderer(gl, sceneVS, sceneFS);

  const camera = new KeyboardCamera();

  function handleResize() {
    const { w, h } = resizeCanvasToDisplaySize(canvas);
    content.resize(w, h);
  }
  window.addEventListener("resize", handleResize);
  handleResize();

  function loop() {
    const { steps, dt, now, delta } = updateTime();

    // sim uses fixed steps
    for (let i = 0; i < steps; i++) sim.step(dt);

    // camera uses real frame delta
    camera.update(delta);
    _dbgT += delta;
    if (_dbgT > 0.5) {
      _dbgT = 0;
      const p = camera.pos;
      console.log("[cam]",
        "pos", p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2),
        "yaw", camera.yaw.toFixed(2),
        "pitch", camera.pitch.toFixed(2)
      );
    }

    for (let i = 0; i < steps; i++) sim.step(dt);

    const { w, h } = resizeCanvasToDisplaySize(canvas);

    content.uploadSim(sim.payload());
    content.render(now, w, h);
    scene.draw(content.texture(), w, h, camera.viewMatrix());

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();
