#version 300 es
precision mediump float;
in vec2 aPoint;
uniform float u_scale;
uniform float u_aspect;
uniform float u_pointSize;
uniform vec2 u_resolution;
uniform float u_time;
void main() {
  // aPoint is in world coords [-u_scale, u_scale]
  vec2 clip = vec2(aPoint.x / (u_scale * u_aspect), aPoint.y / u_scale);
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = u_pointSize;
}

