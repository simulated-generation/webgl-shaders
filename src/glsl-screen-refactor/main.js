import { updateTime } from "./core/time.js";
import { connectBroker } from "./core/websocket-client.js";
import { Simulation } from "./sim/sim.js";
import { ContentRenderer } from "./render/content.js";
import { SceneRenderer } from "./render/scene.js";
import { KeyboardCamera } from "./render/camera.js";
import { getControl, setControl } from "./core/state.js";
import { createCanvasVideoRecorder } from "./core/video-recorder.js";

let _dbgT = 0;

async function loadText(path) {
  // cache-bust so you never wonder what version you’re running
  const url = `${path}?v=${Date.now()}`;

  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();

  // short hash so you can compare quickly across reloads
  let hash = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const h = (hash >>> 0).toString(16).padStart(8, "0");

  console.log(`[shader] ${path} -> ${r.status} len=${text.length} hash=${h}`);
  console.log(`[shader] ${path} head:\n${text.slice(0, 200)}`);
  console.log(`[shader] ${path} tail:\n${text.slice(Math.max(0, text.length - 200))}`);

  if (!r.ok) throw new Error(`fetch ${path} failed: ${r.status}`);
  return text;
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

  const params = new URLSearchParams(window.location.search);

  const id = params.get("id") || "default";
  const shader_id = params.get("shader") || "content";

  const SHADERS = {
    content: "/shaders/content.frag",
    rules: "/shaders/rules01.frag",
    glitch: "/shaders/glitch.frag",
    // add more here
  };

  const contentShader = SHADERS[shader_id] || SHADERS["content"];


  // non-fatal if broker absent
  const broker = connectBroker({ id, log: true });

  const videoRecorder = createCanvasVideoRecorder(canvas, {
    broker,
    roomId: id,
    fps: 60,
    durationMs: 10000,
    dbKey: "latest-video",
  });

  const [contentVS, contentFS, sceneVS, sceneFS] = await Promise.all([
    loadText("/shaders/content.vert"),
    loadText(contentShader),
    loadText("/shaders/scene.vert"),
    loadText("/shaders/scene.frag"),
  ]);

  const sim = new Simulation(400);

  const content = new ContentRenderer(gl, contentVS, contentFS, sim.N, broker, id);
  const scene = new SceneRenderer(gl, sceneVS, sceneFS);

  const camera = new KeyboardCamera();

  function handleResize() {
    const { w, h } = resizeCanvasToDisplaySize(canvas);
    content.resize(w, h);
  }
  window.addEventListener("resize", handleResize);
  handleResize();

  let prevVideo = 0;

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

    //for (let i = 0; i < steps; i++) sim.step(dt);

    const { w, h } = resizeCanvasToDisplaySize(canvas);

    content.uploadSim(sim.payload());
    content.render(now, w, h);
    scene.draw(content.texture(), w, h, camera.viewMatrix());

    const video = getControl("/virtualctl/video", 0);
    const videoRisingEdge = video >= 1 && prevVideo < 1;

    if (videoRisingEdge) {
      if (!videoRecorder.isBusy()) {
        void videoRecorder.start();
      } else {
        console.log("[video] trigger ignored, recorder busy");
      }

      // re-arm the trigger locally so the next /virtualctl/video 1 can fire again
      setControl("/virtualctl/video", 0);
      prevVideo = 0;
    } else {
      prevVideo = video;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();
