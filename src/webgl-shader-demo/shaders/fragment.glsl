#version 300 es
precision mediump float;
out vec4 fragColor;
uniform float u_time;

void main() {
    float glow = 0.8 + 0.2 * sin(u_time * 3.0);
    fragColor = vec4(glow, glow * 0.5, glow * 0.3, 1.0);
}

