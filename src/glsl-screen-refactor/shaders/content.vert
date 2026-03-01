#version 300 es
precision mediump float;
in vec2 aPos;
out vec2 v_uv;
void main() {
  v_uv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
