#version 300 es
precision mediump float;
out vec4 fragColor;
uniform float u_time;
uniform float u_virtualctl_K001;
uniform float u_virtualctl_K002;
uniform float u_virtualctl_K003;
uniform float u_virtualctl_K004;
uniform float u_virtualctl_K005;

void main() {
  float K001 = 1.0 - u_virtualctl_K001;
  float K002 = u_virtualctl_K002;
  float K003 = u_virtualctl_K003;
  float K004 = u_virtualctl_K004;
  float K005 = u_virtualctl_K005;
  vec2 c = gl_PointCoord - vec2(0.5);
  float r = length(c);
  float alpha = 1.0 - smoothstep(0.0, 0.5, r); // 1 near center, 0 at edge
  vec3 col = vec3(1.0*K001);
  fragColor = vec4(col * alpha, alpha);
}

