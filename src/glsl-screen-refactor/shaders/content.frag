#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;

// Controls (from OSC paths like "/zeroctl/F11")
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

// Previous frame from ping-pong
uniform sampler2D u_prev;

const float PI = 3.1415926535897932384626433;
const float DEFAULT_RANDOM_FROM_FLOAT_PARAM = 502000.0;
const float NB_CELLULES = 100.0;

float randomFromFloat(float seed, float param) {
  return fract(sin(seed) * param);
}

float randomFF(float seed) {
  return randomFromFloat(seed, DEFAULT_RANDOM_FROM_FLOAT_PARAM);
}

float rand(float seed) {
  return randomFromFloat(seed, DEFAULT_RANDOM_FROM_FLOAT_PARAM);
}

float noise(float seed) {
  float i = floor(seed);  // integer
  float f = fract(seed);
  return mix(rand(i), rand(i + 1.0), smoothstep(0.0, 1.0, f));
}

mat2 rotate2d(float theta) {
  float c = cos(theta);
  float s = sin(theta);
  return mat2(c, -s,
              s,  c);
}

float courbeExp(float x) {
  return (1.0 - abs(x - 1.0) * abs(x - 1.0) * abs(x - 1.0));
}

float gain(float x, float k) {
  float s = step(0.5, x);
  float t = mix(x, 1.0 - x, s);
  float a = 0.5 * pow(2.0 * t, k);
  return mix(a, 1.0 - a, s);
}

void main() {
  float F11 = u_virtualctl_F001;
  float F12 = u_virtualctl_F002;
  float F13 = u_virtualctl_F003;
  float F14 = u_virtualctl_F004;  //Remanence
  float F15 = u_virtualctl_F005;  //Displacement x
  float F16 = u_virtualctl_F006;  //Displacement y
  float F17 = u_virtualctl_F007;  //Not set / set BPM
  float F18 = u_virtualctl_F008;  //Not set / set particle size
  float F19 = u_virtualctl_F009;  //Number of particles
  float F21 = u_virtualctl_F010;
  float Ox  = u_virtualctl_O001;   //Orientation around the x axis of the controller device
  float Oy  = u_virtualctl_O002;   //Orientation around the y axis of the controller device
  float Oz  = u_virtualctl_O003;   //Orientation around the z axis of the controller device
                                  //
  // In this framework you already have v_uv = 0..1
  vec2 uv = v_uv;

  float Rx = 2.0*smoothstep(0.4, 0.6,     Ox) - 1.0;
  float Ry = 2.0*smoothstep(0.4, 0.6, 1.0-Oy) - 1.0;
  float Rz = 2.0*smoothstep(0.4, 0.6, 1.0-Oz) - 1.0;

  float dispX = (Rx/abs(Rx))*clamp(abs(pow(Rx,4.0)), 0.0, 0.08);
  float dispY = (Ry/abs(Ry))*clamp(abs(pow(Ry,4.0)), 0.0, 0.08);
  //float dispY = F16 * F16 * F16 * F16;

  vec4 prevColor = texture(u_prev, uv - vec2(dispX, dispY));

  vec2 cell = floor(NB_CELLULES * uv);

  float saturation = 0.0;
  vec3 voisins = vec3(0.0);
  for (float i = 0.0; i < 4.0; i += 1.0) {
    for (float j = 0.0; j < 4.0; j += 1.0) {
      voisins += texture(u_prev, vec2(0.125 + 0.25 * i, 0.125 + 0.25 * j)).rgb;
    }
  }
  voisins /= 16.0;
  saturation = length(voisins);

  float cs = 1.0 / NB_CELLULES;

  vec4 prevColorN  = texture(u_prev, uv + vec2(0.0,  cs));
  vec4 prevColorNW = texture(u_prev, uv + vec2(-cs, cs));
  vec4 prevColorNE = texture(u_prev, uv + vec2( cs, cs));
  vec4 prevColorS  = texture(u_prev, uv + vec2(0.0, -cs));
  vec4 prevColorSW = texture(u_prev, uv + vec2(-cs, -cs));
  vec4 prevColorSE = texture(u_prev, uv + vec2( cs, -cs));
  vec4 prevColorW  = texture(u_prev, uv + vec2(-cs, 0.0));
  vec4 prevColorE  = texture(u_prev, uv + vec2( cs, 0.0));

  float point = step(
    courbeExp(F19),
    randomFF(randomFF(cell.x) + randomFF(cell.y) * floor(u_time))
  );

  vec4 pointVoisinEN = mix(prevColorE, prevColorN, 0.5);
  vec4 pointVoisinWS = mix(prevColorW, prevColorS, 0.5);
  vec4 pointVoisinWN = mix(prevColorW, prevColorN, 0.5);
  vec4 pointVoisinES = mix(prevColorE, prevColorS, 0.5);

  float composanteR = (prevColorE.r  + prevColorS.r  + prevColorSE.r + prevColorSW.r) / 4.0;
  float composanteG = (prevColorN.g  + prevColorNE.g + prevColorE.g  + prevColorSW.g) / 4.0;
  float composanteB = (prevColorNW.b + prevColorNE.b + prevColorE.b  + prevColorS.b ) / 4.0;

  vec4 pointBinaire = vec4(composanteR, composanteG, composanteB, 1.0);

  vec3 color = vec3(F11, F12, F13);

  vec4 finalColor =
      vec4((1.0 + F14 / 10.0) * prevColor.xyz + color * point, 1.0)
    + 0.06 * noise(u_time) * (pointVoisinEN + pointVoisinWS + pointVoisinWN + pointVoisinES);

  finalColor = vec4(step(0.1, length(finalColor.rgb)) * finalColor.rgb, 1.0);

  float sstepSaturation = smoothstep(1.5, 1.74, saturation);

  vec3 normalizedV = normalize(finalColor.rgb);
  vec3 diagonal = normalize(vec3(1.0, 1.0, 1.0));
  float alignment = dot(normalizedV, diagonal);

  fragColor = vec4((1.0 - sstepSaturation) * finalColor.rgb - 2.0 * (alignment) * pointBinaire.rgb, 1.0);
  //fragColor = vec4(vec3(Rx, 0.0, 0.0), 1.0);
}
