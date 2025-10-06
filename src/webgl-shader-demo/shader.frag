#version 300 es
precision mediump float;

in vec2 vPos;
out vec4 fragColor;

void main() {
    // Very simple shader: red/green depending on coordinates
    fragColor = vec4(vPos.x * 0.5 + 0.5, vPos.y * 0.5 + 0.5, 0.0, 1.0);
}

