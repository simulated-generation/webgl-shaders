#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;

uniform sampler2D u_prev;      // previous ping-pong frame
uniform sampler2D u_pointsTex; // 1xN RGBA32F sim data
uniform int u_pointCount;

// Decode texel i: rgba = (x, y, a, b)
vec4 simPoint(int i) {
  float u = (float(i) + 0.5) / float(u_pointCount);
  return texture(u_pointsTex, vec2(u, 0.5));
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = v_uv;

  // --- base animated pattern (UV-space) ---
  // moving stripes
  float stripes = 0.5 + 0.5 * sin(12.0 * uv.x + 2.0 * sin(u_time) + u_time * 1.5);

  // circular blob orbiting around center
  vec2 c = vec2(0.5) + 0.18 * vec2(cos(u_time * 0.7), sin(u_time * 0.9));
  float d = length(uv - c);
  float blob = smoothstep(0.18, 0.0, d);

  // subtle grain so you see motion even on flat colors
  float grain = (hash21(uv * u_resolution.xy + u_time) - 0.5) * 0.06;

  // --- prove sim texture is wired ---
  // take sim point0 xy (in sim space) and map it into a small modulation
  vec2 p0 = simPoint(0).xy;
  float simMod = 0.5 + 0.5 * sin(3.0 * p0.x + 5.0 * p0.y + u_time);

  vec3 base = vec3(
    stripes,
    blob,
    0.35 + 0.35 * simMod
  );
  base += grain;

  // --- feedback / ping-pong ---
  // fade previous and add a tiny warp for "smear" feel
  vec2 warp = 0.002 * vec2(
    sin(u_time + uv.y * 10.0),
    cos(u_time + uv.x * 10.0)
  );
  vec3 prev = texture(u_prev, uv + warp).rgb;

  // classic: decay previous, inject new
  float decay = 0.985;
  vec3 outc = prev * decay + base * 0.08;

  // keep within range
  outc = clamp(outc, 0.0, 1.0);

  fragColor = vec4(outc, 1.0);
}
