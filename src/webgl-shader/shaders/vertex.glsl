#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;
uniform vec2 u_resolution;

void main() {
    vec2 p = a_position;
    // Scale equally across both axes
    float aspect = u_resolution.x / u_resolution.y;
    p.x /= aspect;
    gl_Position = vec4(p, 0.0, 1.0);
    gl_PointSize = 2.0;
}

