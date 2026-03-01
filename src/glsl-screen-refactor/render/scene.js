import { createProgram } from "./gl.js";

function mat4Identity() {
  const m = new Float32Array(16);
  m[0]=1; m[5]=1; m[10]=1; m[15]=1;
  return m;
}

function mat4Mul(a, b) {
  const o = new Float32Array(16);
  for (let r=0;r<4;r++){
    for (let c=0;c<4;c++){
      o[c + r*4] =
        a[0 + r*4]*b[c + 0*4] +
        a[1 + r*4]*b[c + 1*4] +
        a[2 + r*4]*b[c + 2*4] +
        a[3 + r*4]*b[c + 3*4];
    }
  }
  return o;
}

function mat4Perspective(fovy, aspect, near, far) {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = (2 * far * near) * nf;
  return m;
}

function mat4Translate(z) {
  const m = mat4Identity();
  m[14] = z;
  return m;
}

export class SceneRenderer {
  constructor(gl, vsSource, fsSource) {
    this.gl = gl;
    this.program = createProgram(gl, vsSource, fsSource);

    // plane: pos (x,y,z) + uv (u,v)
    const verts = new Float32Array([
      -1,-1,0,  0,0,
       1,-1,0,  1,0,
      -1, 1,0,  0,1,
       1, 1,0,  1,1,
    ]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(this.program, "aPos");
    const aUV = gl.getAttribLocation(this.program, "aUV");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 5*4, 0);
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 5*4, 3*4);

    gl.bindVertexArray(null);

    this.u = {
      u_mvp: gl.getUniformLocation(this.program, "u_mvp"),
      u_tex: gl.getUniformLocation(this.program, "u_tex"),
    };
  }

  draw(contentTex, w, h) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    const proj = mat4Perspective(Math.PI/3, w/h, 0.1, 100.0);
    const model = mat4Translate(-2.0);
    const mvp = mat4Mul(proj, model);
    gl.uniformMatrix4fv(this.u.u_mvp, false, mvp);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, contentTex);
    gl.uniform1i(this.u.u_tex, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindVertexArray(null);
  }
}
