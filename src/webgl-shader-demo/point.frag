#version 300 es
precision mediump float;
out vec4 fragColor;

void main() {
  // simple circular point (smooth)
  vec2 c = gl_PointCoord - vec2(0.5);
  float r = length(c);
  float alpha = smoothstep(0.5, 0.45, r); // soft edge
  fragColor = vec4(vec3(1.0), alpha);
}

