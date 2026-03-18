#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;

// External controls: keep names exactly as-is because external code depends on them
uniform float u_virtualctl_F001;
uniform float u_virtualctl_F002;
uniform float u_virtualctl_F003;
uniform float u_virtualctl_F004;
uniform float u_virtualctl_F005;
uniform float u_virtualctl_F006;
uniform float u_virtualctl_F007;
uniform float u_virtualctl_F008;
uniform float u_virtualctl_F009;
uniform float u_virtualctl_F010;
uniform float u_virtualctl_O001;
uniform float u_virtualctl_O002;
uniform float u_virtualctl_O003;

// Previous frame (ping-pong feedback)
uniform sampler2D u_prev;

const float PI = 3.1415926535897932384626433;
const float DEFAULT_RANDOM_FROM_FLOAT_PARAM = 502000.0;
const float NB_CELLULES_MAX = 100.0;

// -----------------------------------------------------------------------------
// Random / noise helpers
// -----------------------------------------------------------------------------

float randomFromFloat(float seed, float param) {
  return fract(sin(seed) * param);
}

float rand(float seed) {
  return randomFromFloat(seed, DEFAULT_RANDOM_FROM_FLOAT_PARAM);
}

// Kept for compatibility with the original naming
float randomFF(float seed) {
  return rand(seed);
}

float noise(float seed) {
  float base = floor(seed);
  float fracPart = fract(seed);
  return mix(rand(base), rand(base + 1.0), smoothstep(0.0, 1.0, fracPart));
}

// -----------------------------------------------------------------------------
// Math helpers
// -----------------------------------------------------------------------------

mat2 rotate2d(float theta) {
  float c = cos(theta);
  float s = sin(theta);
  return mat2(c, -s,
              s,  c);
}

// Original curve used for particle spawning threshold
float courbeExp(float x) {
  return 1.0 - abs(x - 1.0) * abs(x - 1.0) * abs(x - 1.0);
}

float gain(float x, float k) {
  float upperHalf = step(0.5, x);
  float mirrored  = mix(x, 1.0 - x, upperHalf);
  float shaped    = 0.5 * pow(2.0 * mirrored, k);
  return mix(shaped, 1.0 - shaped, upperHalf);
}

// -----------------------------------------------------------------------------
// Controller/orientation mapping
// -----------------------------------------------------------------------------

float orientationToSignedResponse(float rawValue, bool invertAxis) {
  float v = invertAxis ? (1.0 - rawValue) : rawValue;
  return 2.0 * smoothstep(0.4, 0.6, v) - 1.0;
}

// Keep the exact original response curve and clamp.
// Note: the original code used x / abs(x), which is undefined at x == 0.
// We preserve that exact behavior here for functional equivalence.
float signedQuarticDisplacement(float x) {
  return sign(x) * clamp(abs(pow(x, 4.0)), 0.0, 0.08);
}

// -----------------------------------------------------------------------------
// Feedback sampling helpers
// -----------------------------------------------------------------------------

float computeGlobalSaturationProbe(sampler2D previousFrame) {
  vec3 accum = vec3(0.0);

  for (float iy = 0.0; iy < 4.0; iy += 1.0) {
    for (float ix = 0.0; ix < 4.0; ix += 1.0) {
      vec2 probeUV = vec2(0.125 + 0.25 * ix, 0.125 + 0.25 * iy);
      accum += texture(previousFrame, probeUV).rgb;
    }
  }

  accum /= 16.0;
  return length(accum);
}

float computeParticleSpawn(vec2 cellCoord, float timeValue, float densityControl) {
  float seed =
      randomFF(randomFF(cellCoord.x) + randomFF(cellCoord.y) * floor(timeValue));

  return step(courbeExp(densityControl), seed);
}

vec4 computeDirectionalBinaryPattern(
  vec4 north, vec4 northWest, vec4 northEast,
  vec4 south, vec4 southWest, vec4 southEast,
  vec4 west,  vec4 east
) {
  float red =
      (east.r + south.r + southEast.r + southWest.r) / 4.0;

  float green =
      (north.g + northEast.g + east.g + southWest.g) / 4.0;

  float blue =
      (northWest.b + northEast.b + east.b + south.b) / 4.0;

  return vec4(red, green, blue, 1.0);
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

void main() {
  // Preserve the original local aliases
  float F11 = u_virtualctl_F001;
  float F12 = u_virtualctl_F002;
  float F13 = u_virtualctl_F003;
  float F14 = u_virtualctl_F004;  // remanence
  float F15 = u_virtualctl_F005;  // declared externally, unused here
  float F16 = u_virtualctl_F006;  // declared externally, unused here
  float F17 = u_virtualctl_F007;  // declared externally, unused here
  float F18 = u_virtualctl_F008;  // declared externally, unused here
  float F19 = u_virtualctl_F009;  // particle density / threshold control
  float F21 = u_virtualctl_F010;  // declared externally, unused here

  float Ox = u_virtualctl_O001;
  float Oy = u_virtualctl_O002;
  float Oz = u_virtualctl_O003;

  vec2 uv = v_uv;

  // Orientation response
  float responseX = orientationToSignedResponse(Ox, false);
  float responseY = orientationToSignedResponse(Oy, true);
  float responseZ = orientationToSignedResponse(Oz, true);

  // Exact original displacement law
  float displacementX = signedQuarticDisplacement(responseX);
  float displacementY = signedQuarticDisplacement(responseY);

  // Previous frame, shifted by controller-induced displacement
  vec4 feedbackColor = texture(u_prev, uv - vec2(displacementX, displacementY));

  // Current grid cell in the virtual 100x100 lattice
  vec2 cellCoord = floor(NB_CELLULES_MAX * F21 * uv);
  float cellStep = 1.0 / (NB_CELLULES_MAX * F21);

  // Global saturation probe from 16 fixed positions
  float saturation = computeGlobalSaturationProbe(u_prev);

  // 8-neighborhood samples on the virtual cell grid
  vec4 prevN  = texture(u_prev, uv + vec2( 0.0,      cellStep));
  vec4 prevNW = texture(u_prev, uv + vec2(-cellStep, cellStep));
  vec4 prevNE = texture(u_prev, uv + vec2( cellStep, cellStep));
  vec4 prevS  = texture(u_prev, uv + vec2( 0.0,     -cellStep));
  vec4 prevSW = texture(u_prev, uv + vec2(-cellStep,-cellStep));
  vec4 prevSE = texture(u_prev, uv + vec2( cellStep,-cellStep));
  vec4 prevW  = texture(u_prev, uv + vec2(-cellStep, 0.0));
  vec4 prevE  = texture(u_prev, uv + vec2( cellStep, 0.0));

  // Random cell ignition
  float particleSpawn = computeParticleSpawn(cellCoord, u_time, F19);

  // Cross neighbor blends used as a noisy diffusion contribution
  vec4 blendEN = mix(prevE, prevN, 0.5);
  vec4 blendWS = mix(prevW, prevS, 0.5);
  vec4 blendWN = mix(prevW, prevN, 0.5);
  vec4 blendES = mix(prevE, prevS, 0.5);

  // Directional RGB extraction from neighbors
  vec4 directionalBinaryPattern = computeDirectionalBinaryPattern(
    prevN, prevNW, prevNE,
    prevS, prevSW, prevSE,
    prevW, prevE
  );

  // Spawn color
  vec3 injectionColor = vec3(F11, F12, F13);

  // Feedback + injected particles + noisy neighbor diffusion
  vec4 composed =
      vec4((1.0 + F14 / 10.0) * feedbackColor.xyz + injectionColor * particleSpawn, 1.0)
    + 0.06 * noise(u_time) * (blendEN + blendWS + blendWN + blendES);

  // Hard cutoff for very dim values
  composed = vec4(step(0.1, length(composed.rgb)) * composed.rgb, 1.0);

  // Saturation gate
  float saturationGate = smoothstep(1.5, 1.74, saturation);

  // Alignment with white / diagonal RGB axis
  vec3 normalizedColor = normalize(composed.rgb);
  vec3 diagonalRGB = normalize(vec3(1.0, 1.0, 1.0));
  float whiteAlignment = dot(normalizedColor, diagonalRGB);

  // Final output
  fragColor = vec4(
    (1.0 - saturationGate) * composed.rgb
      - 2.0 * whiteAlignment * directionalBinaryPattern.rgb,
    1.0
  );

  // Debug option kept from original:
  // fragColor = vec4(vec3(responseX, 0.0, 0.0), 1.0);
}
