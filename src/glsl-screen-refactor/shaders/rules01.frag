#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;

// External controls: names preserved exactly
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

float randomFF(float seed) {
  return rand(seed);
}

float noise(float seed) {
  float base = floor(seed);
  float fracPart = fract(seed);
  return mix(rand(base), rand(base + 1.0), smoothstep(0.0, 1.0, fracPart));
}

// -----------------------------------------------------------------------------
// Math / utility helpers
// -----------------------------------------------------------------------------

float courbeExp(float x) {
  return 1.0 - abs(x - 1.0) * abs(x - 1.0) * abs(x - 1.0);
}

float gain(float x, float k) {
  float upperHalf = step(0.5, x);
  float mirrored  = mix(x, 1.0 - x, upperHalf);
  float shaped    = 0.5 * pow(2.0 * mirrored, k);
  return mix(shaped, 1.0 - shaped, upperHalf);
}

float orientationToSignedResponse(float rawValue, bool invertAxis) {
  float v = invertAxis ? (1.0 - rawValue) : rawValue;
  return 2.0 * smoothstep(0.4, 0.6, v) - 1.0;
}

float signedQuarticDisplacement(float x) {
  return sign(x) * clamp(abs(pow(x, 4.0)), 0.0, 0.08);
}

vec2 wrapUV(vec2 uv) {
  return fract(uv);
}

vec4 samplePrev(vec2 uv) {
  return texture(u_prev, wrapUV(uv));
}

float safeLuma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float colorDominance(vec3 c, int channelIndex) {
  if (channelIndex == 0) {
    return max(0.0, c.r - max(c.g, c.b));
  }
  if (channelIndex == 1) {
    return max(0.0, c.g - max(c.r, c.b));
  }
  return max(0.0, c.b - max(c.r, c.g));
}

// -----------------------------------------------------------------------------
// Variable cell sizing
// -----------------------------------------------------------------------------

// Creates a region-dependent variable cell size.
// F17 controls overall strength of size variation.
// Low F17 -> finer / more uniform
// High F17 -> chunkier / more random cell blocks
void computeVariableCell(
  vec2 uv,
  float F17,
  out vec2 cellUV,
  out vec2 cellID,
  out float cellStep
) {
  // Base grid density
  float baseCount = mix(18.0, NB_CELLULES_MAX, clamp(F17 * F17, 0.0, 1.0));

  // Coarse region that decides local cell size
  float regionCount = max(4.0, floor(baseCount * 0.18));
  vec2 regionID = floor(uv * regionCount);

  float regionSeed = regionID.x * 173.17 + regionID.y * 91.73;

  // Size multiplier per region
  // At low F17 the multiplier stays close to 1.
  // At high F17 it can expand cells more aggressively.
  float rawMul = mix(1.0, mix(1.0, 5.0, rand(regionSeed)), F17);

  cellStep = rawMul / baseCount;

  vec2 localID = floor(uv / cellStep);
  cellID = localID;
  cellUV = (localID + 0.5) * cellStep;
}

// -----------------------------------------------------------------------------
// Global probes
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

// -----------------------------------------------------------------------------
// Rule system
// -----------------------------------------------------------------------------
//
// Philosophy:
//   next = previous_exact + transport/injection + rules
//
// Keep rules isolated and easy to modify.
// You can add more blocks like:
//   - vertical blue propagation
//   - diagonal green activation
//   - local inhibition
//   - edge erosion / blooming
//

vec3 applyColorRules(
  vec3 currentColor,
  vec3 north, vec3 south, vec3 west, vec3 east,
  vec3 northWest, vec3 northEast, vec3 southWest, vec3 southEast,
  float F14, float F17, float F18
) {
  vec3 outColor = currentColor;

  // ---------------------------------------------------------------------------
  // RULE 1: horizontal red propagation
  //
  // If left/right neighbours are red-dominant, current pixel is nudged toward red.
  // This is capped and resisted by existing red level.
  //
  // Easy knobs:
  //   RED_RULE_STRENGTH      -> how much propagation
  //   RED_RULE_LIMIT         -> max red target
  //   RED_RULE_DOM_THRESHOLD -> how "red" neighbours must be
  // ---------------------------------------------------------------------------

  const float RED_RULE_STRENGTH      = 0.075;
  const float RED_RULE_LIMIT         = 0.92;
  const float RED_RULE_DOM_THRESHOLD = 0.02;
  const float RED_RULE_BLEED_TO_GB   = 0.018;

  float westRedDom = colorDominance(west, 0);
  float eastRedDom = colorDominance(east, 0);

  float horizontalRedInfluence =
      0.5 * smoothstep(RED_RULE_DOM_THRESHOLD, 0.35, westRedDom) * west.r +
      0.5 * smoothstep(RED_RULE_DOM_THRESHOLD, 0.35, eastRedDom) * east.r;

  float redHeadroom = max(0.0, RED_RULE_LIMIT - outColor.r);

  // Slight nonlinearity: stronger response on darker / less-red cells
  float redResistance = 1.0 - smoothstep(0.15, RED_RULE_LIMIT, outColor.r);

  float redPush = RED_RULE_STRENGTH * horizontalRedInfluence * redHeadroom * redResistance;

  outColor.r += redPush;

  // Optional cross-channel tradeoff: as red spreads, G/B slightly compress
  outColor.g -= RED_RULE_BLEED_TO_GB * redPush;
  outColor.b -= RED_RULE_BLEED_TO_GB * redPush;

  // ---------------------------------------------------------------------------
  // RULE 2: local equalization / damping
  //
  // Prevents runaway blow-up while still keeping strong memory.
  // This is not a blur; it is a tiny stabilizer against singular spikes.
  // ---------------------------------------------------------------------------

  vec3 axialMean = 0.25 * (north + south + west + east);
  float dampingAmount = mix(0.002, 0.02, F14);
  outColor = mix(outColor, max(outColor, axialMean * 0.985), dampingAmount);

  // ---------------------------------------------------------------------------
  // RULE 3: diagonal spark asymmetry
  //
  // Tiny asymmetric perturbation to avoid too-static stripe lock.
  // Not noise diffusion; more like a deterministic instability.
  // ---------------------------------------------------------------------------

  float diagContrast =
      length(northWest - southEast) +
      length(northEast - southWest);

  float spark = 0.01 * smoothstep(0.15, 1.2, diagContrast) * (0.25 + 0.75 * F18);

  outColor.r += spark * (east.r - west.r);
  outColor.g += spark * (north.g - south.g);
  outColor.b += spark * (southWest.b - northEast.b);

  // Clamp after rules
  return clamp(outColor, 0.0, 1.0);
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

void main() {
  // Original aliases preserved
  float F11 = u_virtualctl_F001;
  float F12 = u_virtualctl_F002;
  float F13 = u_virtualctl_F003;
  float F14 = u_virtualctl_F004;  // remanence / persistence feel
  float F15 = u_virtualctl_F005;
  float F16 = u_virtualctl_F006;
  float F17 = u_virtualctl_F007;  // cell size variation
  float F18 = u_virtualctl_F008;  // spawn density
  float F19 = u_virtualctl_F009;
  float F21 = u_virtualctl_F010;

  float Ox = u_virtualctl_O001;
  float Oy = u_virtualctl_O002;
  float Oz = u_virtualctl_O003;

  vec2 uv = v_uv;

  // Orientation response
  float responseX = orientationToSignedResponse(Ox, false);
  float responseY = orientationToSignedResponse(Oy, true);
  float responseZ = orientationToSignedResponse(Oz, true);

  float displacementX = signedQuarticDisplacement(responseX) * (1.0 + (4.0 * F15));
  float displacementY = signedQuarticDisplacement(responseY) * (1.0 + (4.0 * F16));

  // ---------------------------------------------------------------------------
  // 1. Exact previous frame transport
  // ---------------------------------------------------------------------------

  vec2 shiftedUV = vec2(
    mod(uv.x - displacementX + 1.0, 1.0),
    mod(uv.y - displacementY + 1.0, 1.0)
  );

  vec4 baseFeedback = samplePrev(shiftedUV);

  // ---------------------------------------------------------------------------
  // 2. Variable cell logic
  // ---------------------------------------------------------------------------

  vec2 cellUV;
  vec2 cellID;
  float cellStep;
  computeVariableCell(uv, F17, cellUV, cellID, cellStep);

  vec4 cellFeedback = samplePrev(cellUV);

  // Neighbourhood sampled on the variable cell lattice
  vec2 dx = vec2(cellStep, 0.0);
  vec2 dy = vec2(0.0, cellStep);

  vec3 prevN  = samplePrev(cellUV + dy).rgb;
  vec3 prevS  = samplePrev(cellUV - dy).rgb;
  vec3 prevW  = samplePrev(cellUV - dx).rgb;
  vec3 prevE  = samplePrev(cellUV + dx).rgb;
  vec3 prevNW = samplePrev(cellUV - dx + dy).rgb;
  vec3 prevNE = samplePrev(cellUV + dx + dy).rgb;
  vec3 prevSW = samplePrev(cellUV - dx - dy).rgb;
  vec3 prevSE = samplePrev(cellUV + dx - dy).rgb;

  // Random ignition still tied to cell logic
  float particleSpawn = computeParticleSpawn(cellID, u_time, F18);
  vec3 injectionColor = vec3(F11, F12, F13);

  // ---------------------------------------------------------------------------
  // 3. New feedback composition
  // ---------------------------------------------------------------------------
  //
  // Instead of:
  //   feedback + noisy diffusion - directional pattern
  //
  // We do:
  //   exact transported previous frame
  //   + optional injection on variable cells
  //   + rule-based colour mutation
  //

  // Preserve previous frame strongly
  float memory = 0.985 + 0.02 * F14;

  // Use cellFeedback as the state on which rules operate
  vec3 carriedColor = mix(baseFeedback.rgb, cellFeedback.rgb, 0.65) * memory;

  // Cell-based injection
  // Slightly quantized because it is attached to variable cells
  float injectionAmount = particleSpawn * (0.08 + 0.35 * F18);
  carriedColor += injectionColor * injectionAmount;

  // Apply rule system
  vec3 ruledColor = applyColorRules(
    carriedColor,
    prevN, prevS, prevW, prevE,
    prevNW, prevNE, prevSW, prevSE,
    F14, F17, F18
  );

  // ---------------------------------------------------------------------------
  // 4. Soft global safety / saturation control
  // ---------------------------------------------------------------------------

  float saturation = computeGlobalSaturationProbe(u_prev);
  float saturationGate = smoothstep(1.45, 1.78, saturation);

  // Instead of destructive subtraction, compress toward a softer ceiling
  ruledColor *= mix(1.0, 0.92, saturationGate);

  // Remove nearly-black dust
  if (length(ruledColor) < 0.03) {
    ruledColor = vec3(0.0);
  }

  fragColor = vec4(clamp(ruledColor, 0.0, 1.0), 1.0);
}
