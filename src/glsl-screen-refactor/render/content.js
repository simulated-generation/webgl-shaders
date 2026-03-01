import { createProgram, createFullscreenVAO } from "./gl.js";
import { updateUniforms } from "../core/state.js";

export class ContentRenderer {
  constructor(gl, vsSource, fsSource, pointCount) {
    this.gl = gl;
    this.pointCount = pointCount;

    this.program = createProgram(gl, vsSource, fsSource);
    this.vao = createFullscreenVAO(gl, this.program, "aPos");

    this.textures = [gl.createTexture(), gl.createTexture()];
    this.fbos = [gl.createFramebuffer(), gl.createFramebuffer()];
    this.current = 0;

    this.pointsTex = gl.createTexture();

    this.u = {
      u_resolution: gl.getUniformLocation(this.program, "u_resolution"),
      u_time: gl.getUniformLocation(this.program, "u_time"),
      u_prev: gl.getUniformLocation(this.program, "u_prev"),
      u_pointsTex: gl.getUniformLocation(this.program, "u_pointsTex"),
      u_pointCount: gl.getUniformLocation(this.program, "u_pointCount"),
    };
  }

  resize(w, h) {
    const gl = this.gl;

    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[i]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[i], 0);

      gl.clearColor(0,0,0,1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    // allocate sim data texture storage (1 x N RGBA32F)
    gl.bindTexture(gl.TEXTURE_2D, this.pointsTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.pointCount, 1, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  uploadSim(payloadRGBAFloat32) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.pointsTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.pointCount, 1, gl.RGBA, gl.FLOAT, payloadRGBAFloat32);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  render(timeSeconds, w, h) {
    const gl = this.gl;

    const prev = this.current;
    const next = 1 - this.current;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[next]);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[prev]);
    gl.uniform1i(this.u.u_prev, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.pointsTex);
    gl.uniform1i(this.u.u_pointsTex, 1);

    gl.uniform2f(this.u.u_resolution, w, h);
    gl.uniform1f(this.u.u_time, timeSeconds);
    gl.uniform1i(this.u.u_pointCount, this.pointCount);

    // Pass all OSC controls as uniforms into this shader
    updateUniforms(gl, this.program);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.current = next;
  }

  texture() {
    return this.textures[this.current];
  }
}
