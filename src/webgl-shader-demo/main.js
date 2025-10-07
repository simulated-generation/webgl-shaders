const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl2", { antialias: false });
if (!gl) throw new Error("WebGL2 not supported");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}
window.addEventListener("resize", resize);
resize();

async function loadShader(url, type) {
  const src = await fetch(url).then(r => r.text());
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    throw new Error("Shader compile failed: " + url);
  }
  return shader;
}

async function init() {
  const vert = await loadShader("shader.vert", gl.VERTEX_SHADER);
  const frag = await loadShader("shader.frag", gl.FRAGMENT_SHADER);

  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    throw new Error("Program link failed");
  }

  gl.useProgram(prog);

  // Fullscreen quad
  const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  // Uniforms
  const u_time = gl.getUniformLocation(prog, "u_time");
  const u_prev = gl.getUniformLocation(prog, "u_prev");
  const u_resolution = gl.getUniformLocation(prog, "u_resolution");

  // --- Ping-pong textures ---
  function makeTex() {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  const texA = makeTex();
  const texB = makeTex();

  const fboA = gl.createFramebuffer();
  const fboB = gl.createFramebuffer();

  gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texA, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texB, 0);

  let srcTex = texA, dstFbo = fboB;

  let startTime = performance.now();

  function render() {
    const time = (performance.now() - startTime) * 0.001;

    // Set uniforms
    gl.useProgram(prog);
    gl.uniform1f(u_time, time);
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.uniform1i(u_prev, 0);

    // Render to dst framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Copy result to screen
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, dstFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, canvas.width, canvas.height,
                       0, 0, canvas.width, canvas.height,
                       gl.COLOR_BUFFER_BIT, gl.NEAREST);

    // Swap ping-pong buffers
    [srcTex, dstFbo] = srcTex === texA ? [texB, fboA] : [texA, fboB];

    requestAnimationFrame(render);
  }

  render();
}

init();

