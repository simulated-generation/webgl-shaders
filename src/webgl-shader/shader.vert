#version 300 es
precision mediump float;

in vec2 aPos;
out vec2 vPos;

void main() {
    vPos = aPos;
    gl_Position = vec4(aPos, 0.0, 1.0);
}

