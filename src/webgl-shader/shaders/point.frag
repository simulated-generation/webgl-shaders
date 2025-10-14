#version 300 es
precision mediump float;
out vec4 fragColor;
uniform float u_time;
uniform float uVirtualctlK01;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float r = length(c);
  float alpha = 1.0 - smoothstep(0.0, 0.5, r); // 1 near center, 0 at edge
  vec3 col = vec3(1.0*uVirtualctlK01);
  fragColor = vec4(col * alpha, alpha);
}

