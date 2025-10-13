let points = [];
const N = 400;
let t = 0;

const a = 1.0;
const b = -0.05;
const TWO_PI = Math.PI * 2;

function complexExp(re, im) {
    const e = Math.exp(re);
    return [e * Math.cos(im), e * Math.sin(im)];
}

export function initSimulation() {
    points = new Array(N).fill([0, 0]);
}

export function updateSimulation(dt) {
    t += dt;
    points = [];
    for (let i = 0; i < N; i++) {
          const x = (2.0 + Math.sin(t)) * (i / N) * 4.0 - 4.0; // from -2 to +2
          const [xr, yi] = complexExp(b * x, a * TWO_PI * (x + 0.2 * t));
          points.push([xr, yi]);
        }
}

export function getPoints() {
    return points.flat();
}

