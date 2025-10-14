// renderer.js
// Minimal, robust ping-pong feedback renderer:
// - quad pass: dst = prev * decay
// - points pass: additive draw of points into dst
// - copy dst -> screen
import { createShaderProgram } from "./shader.js";
import { updateUniforms } from './state.js';

let gl = null;

// Programs + VAOs
let pointProgram = null, quadProgram = null, copyProgram = null;
let pointVAO = null, quadVAO = null;
let pointBuf = null;

let fbos = [null, null];
let textures = [null, null];
let current = 0; // index of texture that holds last-frame contents

// Uniform locations (cached)
let uni = {
  point: {},
  quad: {},
  copy: {}
};

export function initRenderer(canvas, pointVS, pointFS, quadVS, quadFS) {
  gl = canvas.getContext("webgl2", { antialias: true });
  if (!gl) throw new Error("WebGL2 required");

  // compile programs
  pointProgram = createShaderProgram(gl, pointVS, pointFS);
  quadProgram = createShaderProgram(gl, quadVS, quadFS);

  // simple copy program (fullscreen textured quad)
  copyProgram = createShaderProgram(gl,
    `#version 300 es
     precision mediump float;
     out vec2 v_uv;
     void main() {
       // create a fullscreen quad using gl_VertexID
       vec2 pos = vec2((gl_VertexID == 1 || gl_VertexID == 3) ? 1.0 : -1.0,
                       (gl_VertexID >= 2) ? 1.0 : -1.0);
       v_uv = pos * 0.5 + 0.5;
       gl_Position = vec4(pos, 0.0, 1.0);
     }`,
    `#version 300 es
     precision mediump float;
     in vec2 v_uv;
     uniform sampler2D u_tex;
     out vec4 fragColor;
     void main() {
       fragColor = texture(u_tex, v_uv);
     }`
  );

  // create a VAO + VBO for the quad (used by quadProgram)
  quadVAO = gl.createVertexArray();
  gl.bindVertexArray(quadVAO);
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  const quadVerts = new Float32Array([-1,-1,  1,-1,  -1,1,  1,1]);
  gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(quadProgram, "aPos");
  if (aPos >= 0) {
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  }
  gl.bindVertexArray(null);

  // point VAO + VBO (dynamic)
  pointVAO = gl.createVertexArray();
  gl.bindVertexArray(pointVAO);
  pointBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
  // initially allocate some space (will realloc later)
  gl.bufferData(gl.ARRAY_BUFFER, 1024 * 8, gl.DYNAMIC_DRAW);
  const aPoint = gl.getAttribLocation(pointProgram, "aPoint");
  if (aPoint >= 0) {
    gl.enableVertexAttribArray(aPoint);
    gl.vertexAttribPointer(aPoint, 2, gl.FLOAT, false, 0, 0);
  }
  gl.bindVertexArray(null);

  // uniform locations
  uni.point.u_resolution = gl.getUniformLocation(pointProgram, "u_resolution");
  uni.point.u_scale = gl.getUniformLocation(pointProgram, "u_scale");
  uni.point.u_aspect = gl.getUniformLocation(pointProgram, "u_aspect");
  uni.point.u_pointSize = gl.getUniformLocation(pointProgram, "u_pointSize");
  uni.point.u_time = gl.getUniformLocation(pointProgram, "u_time");

  uni.quad.u_resolution = gl.getUniformLocation(quadProgram, "u_resolution");
  uni.quad.u_prev = gl.getUniformLocation(quadProgram, "u_prev");
  uni.quad.u_decay = gl.getUniformLocation(quadProgram, "u_decay");

  uni.copy.u_tex = gl.getUniformLocation(copyProgram, "u_tex");

  // create textures + fbos (actual storage allocated in resize)
  for (let i = 0; i < 2; i++) {
    textures[i] = gl.createTexture();
    fbos[i] = gl.createFramebuffer();
  }

  // GL state defaults
  gl.disable(gl.DEPTH_TEST);
  // blending state will be toggled per-pass
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  // call resize once to allocate textures
  resize(canvas);
}

// --- resize (allocate textures + attach to fbos) ---
export function resize(canvas) {
  if (!gl) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = Math.max(1, Math.floor(canvas.clientWidth));
  const cssH = Math.max(1, Math.floor(canvas.clientHeight));
  const w = cssW * dpr;
  const h = cssH * dpr;

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);

  // allocate textures
  for (let i = 0; i < 2; i++) {
    gl.bindTexture(gl.TEXTURE_2D, textures[i]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[i]);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[i], 0);

    // Clear the texture once (avoid garbage on first frame)
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
}

// --- drawFrame: points is array/Float32Array [x,y,x,y,...], time s ---
// options: decay (0..1), pointSize (px)
export function drawFrame(points, time, options = {}) {
  if (!gl) return;
  const decay = (options.decay !== undefined) ? options.decay : 0.95;
  const pointSize = (options.pointSize !== undefined) ? options.pointSize : 4.0;
  const prev = current;
  const next = 1 - current;

  // ---- 1) quad pass: dst = prev * decay ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[next]);
  // no blending, we overwrite dst with faded prev
  gl.disable(gl.BLEND);
  gl.useProgram(quadProgram);
  gl.bindVertexArray(quadVAO);

  // bind prev texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures[prev]);
  gl.uniform1i(uni.quad.u_prev, 0);
  gl.uniform2f(uni.quad.u_resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.uniform1f(uni.quad.u_decay, decay);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);

  // ---- 2) points pass: additive draw into dst ----
  // upload point buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
  const arr = (points instanceof Float32Array) ? points : new Float32Array(points);
  gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);

  gl.useProgram(pointProgram);
  gl.bindVertexArray(pointVAO);

  // uniforms for point shader
  gl.uniform2f(uni.point.u_resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
  // u_scale & u_aspect should be set by the caller; if not set we default to 2.0
  const defaultScale = options.scale || 2.0;
  gl.uniform1f(uni.point.u_scale, defaultScale);
  const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
  gl.uniform1f(uni.point.u_aspect, aspect);
  gl.uniform1f(uni.point.u_pointSize, pointSize * (window.devicePixelRatio || 1));
  gl.uniform1f(uni.point.u_time, time);

  updateUniforms(gl, pointProgram);

  // additive blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  gl.drawArrays(gl.POINTS, 0, arr.length / 2);

  gl.bindVertexArray(null);
  gl.disable(gl.BLEND);

  // ---- 3) copy dst texture to screen ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.useProgram(copyProgram);
  // we can draw a fullscreen quad with gl.drawArrays; copy program uses gl_VertexID
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures[next]);
  gl.uniform1i(uni.copy.u_tex, 0);

  // draw (no VAO needed because copyProgram uses gl_VertexID)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // swap
  current = next;

  // gl error quick check (optional)
  const err = gl.getError();
  if (err !== gl.NO_ERROR) console.warn("GL error after drawFrame:", err);
}

// --- Debug helpers ---
export function checkFBOs() {
  if (!gl) return null;
  const res = [];
  for (let i = 0; i < 2; i++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[i]);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    res.push({ index: i, status });
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  console.log("FBO statuses:", res);
  return res;
}

export function dumpPixelFromCurrent(x, y) {
  if (!gl) return null;
  // read a single pixel from the current (last rendered) texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[current]);
  const px = new Uint8Array(4);
  // flip Y to match canvas coordinates if needed; here use 0..height-1
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  console.log("pixel", x, y, px);
  return px;
}

export function getGLError() {
  if (!gl) return null;
  const e = gl.getError();
  console.log("GL error:", e);
  return e;
}

