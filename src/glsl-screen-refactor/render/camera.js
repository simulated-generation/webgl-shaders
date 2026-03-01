// render/camera.js
// Minimal keyboard-only free-fly camera (position + yaw/pitch).
// Controls:
//   W/S: forward/back
//   A/D: left/right (strafe)
//   Q/E: down/up
//   ArrowLeft/Right: yaw
//   ArrowUp/Down: pitch
//   Shift: faster
//   Backspace: reset

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

export class KeyboardCamera {
  constructor() {
    this.reset();

    this.keys = new Set();
    window.addEventListener("keydown", (e) => {
      console.log("[camera] keydown:", e.key, "code:", e.code);
      // prevent backspace navigating back
      if (e.key === "Backspace") e.preventDefault();
      this.keys.add(e.key);
      if (e.key === "Backspace") this.reset();
    }, { passive: false });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key);
    });
  }

  reset() {
    // Camera in world space looking towards -Z
    this.pos = { x: 0, y: 0, z: 0 };
    this.yaw = 0;   // radians
    this.pitch = 0; // radians
  }

  update(dt) {
    const fast = this.keys.has("Shift");
    const moveSpeed = (fast ? 3.0 : 1.2);   // units per second
    const rotSpeed  = (fast ? 2.2 : 1.4);   // rad per second

    // rotation (arrow keys)
    if (this.keys.has("ArrowLeft"))  this.yaw   += rotSpeed * dt;
    if (this.keys.has("ArrowRight")) this.yaw   -= rotSpeed * dt;
    if (this.keys.has("ArrowUp"))    this.pitch += rotSpeed * dt;
    if (this.keys.has("ArrowDown"))  this.pitch -= rotSpeed * dt;

    // prevent flipping
    this.pitch = clamp(this.pitch, -1.45, 1.45);

    // basis vectors from yaw/pitch
    const cy = Math.cos(this.yaw),  sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);

    // Forward (camera direction) in world space
    const fwd = { x: -sy * cp, y: sp, z: -cy * cp };
    // Right vector (yaw-only keeps it stable)
    const right = { x: cy, y: 0, z: -sy };
    // Up vector (world up)
    const up = { x: 0, y: 1, z: 0 };

    let mx = 0, my = 0, mz = 0;

    // movement keys
    if (this.keys.has("w") || this.keys.has("W")) { mx += fwd.x; my += fwd.y; mz += fwd.z; }
    if (this.keys.has("s") || this.keys.has("S")) { mx -= fwd.x; my -= fwd.y; mz -= fwd.z; }
    if (this.keys.has("d") || this.keys.has("D")) { mx += right.x; my += right.y; mz += right.z; }
    if (this.keys.has("a") || this.keys.has("A")) { mx -= right.x; my -= right.y; mz -= right.z; }
    if (this.keys.has("e") || this.keys.has("E")) { mx += up.x; my += up.y; mz += up.z; }
    if (this.keys.has("q") || this.keys.has("Q")) { mx -= up.x; my -= up.y; mz -= up.z; }

    const len = Math.hypot(mx, my, mz);
    if (len > 1e-6) {
      mx /= len; my /= len; mz /= len;
      this.pos.x += mx * moveSpeed * dt;
      this.pos.y += my * moveSpeed * dt;
      this.pos.z += mz * moveSpeed * dt;
    }
  }

  viewMatrix() {
    const cy = Math.cos(this.yaw),  sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
  
    // Forward direction (where camera looks), world space
    const fx = -sy * cp;
    const fy =  sp;
    const fz = -cy * cp;
  
    // Right (yaw-only keeps strafe stable)
    const rx =  cy;
    const ry =  0;
    const rz = -sy;
  
    // Up = cross(right, forward)
    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;
  
    const px = this.pos.x, py = this.pos.y, pz = this.pos.z;
  
    // Column-major view matrix:
    // [ rx  ux  -fx  0
    //   ry  uy  -fy  0
    //   rz  uz  -fz  0
    //  -dot(r,p) -dot(u,p) dot(f,p) 1 ]
    const m = new Float32Array(16);
  
    m[0]  = rx;  m[4]  = ux;  m[8]  = -fx;  m[12] = -(rx*px + ry*py + rz*pz);
    m[1]  = ry;  m[5]  = uy;  m[9]  = -fy;  m[13] = -(ux*px + uy*py + uz*pz);
    m[2]  = rz;  m[6]  = uz;  m[10] = -fz;  m[14] =  (fx*px + fy*py + fz*pz);
    m[3]  = 0;   m[7]  = 0;   m[11] = 0;    m[15] = 1;
  
    return m;
  }
}
