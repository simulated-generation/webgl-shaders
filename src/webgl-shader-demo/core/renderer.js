import { createShaderProgram } from "./shader.js";

let gl, program, buffer, uResolution, uTime, uPointCount;
let pointCount = 0;

export function initRenderer(canvas, vsSource, fsSource) {
  gl = canvas.getContext("webgl2");
  program = createShaderProgram(gl, vsSource, fsSource);

  buffer = gl.createBuffer();

  uResolution = gl.getUniformLocation(program, "u_resolution");
  uTime = gl.getUniformLocation(program, "u_time");
  uPointCount = gl.getUniformLocation(program, "u_pointCount");

  gl.useProgram(program);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  resize(canvas);
}

export function resize(canvas) {
  const width = canvas.clientWidth * window.devicePixelRatio;
  const height = canvas.clientHeight * window.devicePixelRatio;
  canvas.width = width;
  canvas.height = height;
  gl.viewport(0, 0, width, height);
  gl.uniform2f(uResolution, width, height);
}

export function drawFrame(points, time) {
  pointCount = points.length / 2;
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);
  gl.uniform1f(uTime, time);
  gl.uniform1i(uPointCount, pointCount);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);

  const aPos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.POINTS, 0, pointCount);
}

