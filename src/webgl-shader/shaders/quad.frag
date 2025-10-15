#version 300 es
precision mediump float;
in vec2 vUV;
out vec4 fragColor;
uniform sampler2D u_prev;
uniform vec2 u_resolution;
uniform float u_decay;
void main(){
  vec4 prev = texture(u_prev, vUV);
  fragColor = (prev * u_decay);
//vec4 color = vec4(vUV.x, vUV.y, 0.0,1.0);
//fragColor = 0.3*color + (prev * u_decay);
}

