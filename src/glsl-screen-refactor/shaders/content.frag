#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;

uniform sampler2D u_prev;      // previous content frame (ping-pong)
uniform sampler2D u_pointsTex; // 1xN RGBA32F sim data
uniform int u_pointCount;

// Controller (OSC path "/virtualctl/K002" -> uniform "u_virtualctl_K002")
uniform float u_virtualctl_K002;

// Decode one sim point (xr, yi, xParam, iNorm)
vec4 simPoint(int i) {
  float u = (float(i) + 0.5) / float(u_pointCount);
  return texture(u_pointsTex, vec2(u, 0.5));
}

// Cheap grid lines in UV
float grid(vec2 uv, float cells) {
  vec2 g = abs(fract(uv * cells) - 0.5);
  float line = min(g.x, g.y);
  return 1.0 - smoothstep(0.0, 0.02, line);
}

// Map sim-space (roughly around [-something..something]) into UV 0..1.
// Tune this scale to match your sim range.
vec2 simToUV(vec2 p) {
  // "scale" controls how much of sim-space fits on screen.
  float scale = 2.2;
  return 0.5 + 0.5 * (p / scale);
}

void main() {
  vec2 uv = v_uv;

  // --- 1) animated UV debug background ---
  float g1 = grid(uv + 0.02*sin(u_time*0.7), 10.0);
  float g2 = grid(uv, 2.0) * 0.5;
  vec3 bg = vec3(0.05) + vec3(0.15, 0.10, 0.20) * g2 + vec3(0.10) * g1;

  // --- 2) draw the sim curve as a glow field ---
  // Use K002 to control point glow size/intensity.
  float k = clamp(u_virtualctl_K002, 0.0, 1.0);
  float radius = mix(0.020, 0.004, k);    // higher k -> tighter points
  float gain   = mix(0.4,  2.0,  k);      // higher k -> brighter

  float glow = 0.0;

  // Sample a subset of points for speed: change STEP to 1 for full detail.
  const int STEP = 3;
  for (int i = 0; i < 4000; i += STEP) {          // compile-time upper bound
    if (i >= u_pointCount) break;                 // actual count
    vec4 p = simPoint(i);

    vec2 puv = simToUV(p.xy);
    float d = length(uv - puv);

    // Additive gaussian-ish glow
    glow += exp(- (d*d) / (radius*radius)) * (0.4 + 0.6 * p.w);
  }

  vec3 curve = vec3(0.9, 0.6, 0.2) * glow * gain;

  // --- 3) simple feedback trail ---
  vec3 prev = texture(u_prev, uv).rgb;
  float decay = 0.965;           // lower = shorter trails
  vec3 outc = prev * decay + bg * 0.15 + curve;

  // Clamp so it doesn't blow out forever
  outc = clamp(outc, 0.0, 1.0);

  fragColor = vec4(outc, 1.0);
}
