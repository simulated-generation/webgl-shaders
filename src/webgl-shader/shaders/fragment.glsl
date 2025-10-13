#version 300 es
precision mediump float;
out vec4 fragColor;

uniform float u_time;
uniform sampler2D u_prev;
uniform vec2 u_resolution;

// Blend decay factor
const float decay = 1.0;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec4 prev = texture(u_prev, uv);

    // Glowing new points
    float glow = 0.8 + 0.2 * sin(u_time * 8.0);
    vec3 color = vec3(glow);

    // Blend new pixel over faded old frame
    fragColor = vec4(prev.rgb * decay + color * 0.9, 1.0);
}

