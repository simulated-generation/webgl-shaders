#version 300 es
precision mediump float;
in vec3 aPos;
in vec2 aUV;
uniform mat4 u_mvp;
out vec2 v_uv;
void main() {
  v_uv = aUV;
  gl_Position = u_mvp * vec4(aPos, 1.0);
}
