#version 300 es
precision mediump float;
in vec2 vUV;
out vec4 fragColor;
uniform sampler2D u_prev;
uniform vec2 u_resolution;
uniform float u_decay;
void main(){
  vec4 prev = texture(u_prev, vUV);
  fragColor = prev * u_decay;
}

