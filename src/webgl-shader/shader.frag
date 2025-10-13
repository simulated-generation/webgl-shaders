#version 300 es
precision mediump float;

in vec2 vPos;
out vec4 fragColor;

uniform sampler2D u_prev;
uniform vec2 u_resolution;
uniform float u_time;

const float a = 1.0;
const float b = -0.1;
const float scale = 2.0;
const float decay = 0.95;
const float PI = 3.1415926;

// Convert complex exponential
vec2 complexExp(vec2 z) {
    float ex = exp(z.x);
    return ex * vec2(cos(z.y), sin(z.y));
}

void main() {
    // Correct for aspect ratio so that scaling is isotropic
    float aspect = u_resolution.x / u_resolution.y;

    // Map coords to [-1,1] and scale isotropically
    vec2 uv = vPos * vec2(scale * aspect, scale);

    // Compute current f(x)
    float x = uv.x;
    vec2 f = complexExp(vec2(0.5, 0.25 * PI * u_time));

    // Distance from this pixel to function graph
    float dist = length(uv - f);
    float thickness = 0.03;
    float curve = smoothstep(thickness, 0.0, dist);

    // Read previous frame color (feedback)
    vec2 texcoord = (vPos * 0.5 + 0.5);
    vec4 prev = texture(u_prev, texcoord);

    // Combine: fade old pixels, add new
    vec4 color = prev * decay + vec4(vec3(curve), 1.0);

    fragColor = color;
}

