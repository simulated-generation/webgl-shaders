#version 300 es
precision mediump float;

in vec2 aPoint; // complex-plane coords (x,y)
uniform float u_scale;   // how many world units map to +/-1 vertically
uniform float u_aspect;  // width / height
uniform float u_pointSize; // in pixels * devicePixelRatio
uniform vec2 u_resolution;
void main() {
  // Convert complex-plane coords to clip-space (-1..1), isotropic scaling
  // aPoint is in complex plane coordinates: x in [-u_scale, u_scale], y in [-u_scale, u_scale]
  vec2 clip = vec2(aPoint.x / (u_scale * u_aspect), aPoint.y / u_scale);
  gl_Position = vec4(clip, 0.0, 1.0);
  // Convert point size in pixels to gl_PointSize (account for canvas DPI)
  // gl_PointSize is in pixels
  gl_PointSize = u_pointSize;
}

