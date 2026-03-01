#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;

uniform sampler2D u_prev;      // previous ping-pong texture
uniform sampler2D u_pointsTex; // 1xN RGBA32F sim data
uniform int u_pointCount;

// Example control uniforms (auto-set if present):
// uniform float u_virtualctl_K003;
// uniform float u_virtualctl_K004;

vec4 simPoint(int i) {
  float u = (float(i) + 0.5) / float(u_pointCount);
  return texture(u_pointsTex, vec2(u, 0.5));
}

void main() {
  // Debug: show UVs as RG
  vec3 base = vec3(v_uv, 0.0);

  // Prove prev is wired (but keep it subtle to not ruin debug)
  vec3 prev = texture(u_prev, v_uv).rgb;
  base += 0.0 * prev; // change later

  // Prove sim is wired: add a tiny modulation from point 0
  vec4 p0 = simPoint(0);
  float blink = 0.5 + 0.5 * sin(u_time * 2.0);
  base += blink * 0.05 * vec3(abs(p0.x), abs(p0.y), 0.0);

  fragColor = vec4(base, 1.0);
}
