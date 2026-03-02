import { getControl } from "../core/state.js";

const TWO_PI = Math.PI * 2;

function hash11(x) {
  return (Math.sin(x * 127.1) * 43758.5453) % 1;
}

function complexExp(re, im) {
  const e = Math.exp(re);
  return [e * Math.cos(im), e * Math.sin(im)];
}

/**
 * Simulation outputs a Float32Array of size N*4, designed to be uploaded as a 1xN RGBA32F texture.
 *
 * Texel i layout (RGBA):
 *   R: x (float)
 *   G: y (float)
 *   B: param or attribute (free)
 *   A: param or attribute (free)
 */
export class Simulation {
  constructor(N = 400) {
    this.N = N;
    this.t = 0;
    this.data = new Float32Array(N * 4);
  }

  step(dt) {
    this.t += dt;

    const N = this.N;
    const out = this.data;

    // controls (safe defaults)
    const k4 = getControl("/virtualctl/K004", 0.5);
    const k5 = getControl("/virtualctl/K005", 0.5);

    const a = 1.0;
    const b = -0.05;

    for (let i = 0; i < N; i++) {
      const x = (2.0 + Math.sin(this.t)) * (i / N) * 4.0 - 4.0;

      const re = 3.0 * k4 * b * x;
      const im = (1.0 + k5 * hash11(i)) * a * TWO_PI * (x + 0.2 * this.t);

      const [xr, yi] = complexExp(re, im);

      const o = i * 4;
      out[o + 0] = xr;      // x
      out[o + 1] = yi;      // y
      out[o + 2] = x;       // store param x
      out[o + 3] = i / N;   // normalized index
    }
  }

  payload() {
    return this.data;
  }
}
