import { createProgram, createFullscreenVAO } from "./gl.js";
import { updateUniforms, getControl, setControl } from "../core/state.js";

function flipRowsInPlace(buf, width, height) {
  const stride = width * 4;
  const tmp = new Uint8Array(stride);
  const half = Math.floor(height / 2);

  for (let y = 0; y < half; y++) {
    const top = y * stride;
    const bot = (height - 1 - y) * stride;

    tmp.set(buf.subarray(top, top + stride));
    buf.copyWithin(top, bot, bot + stride);
    buf.set(tmp, bot);
  }
}

function rgbaToPNGBlob(rgba, width, height) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("2D canvas unavailable"));
      return;
    }

    const imageData = new ImageData(
      new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
      width,
      height
    );
    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("PNG encoding failed"));
      else resolve(blob);
    }, "image/png");
  });
}

function openImageDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("content-renderer-db", 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveBlobToIndexedDB(key, blob, meta = {}) {
  const db = await openImageDB();

  await new Promise((resolve, reject) => {
    const tx = db.transaction("images", "readwrite");
    const store = tx.objectStore("images");

    store.put(
      {
        blob,
        meta,
        savedAt: new Date().toISOString(),
      },
      key
    );

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  db.close();
}

export class ContentRenderer {
  constructor(gl, vsSource, fsSource, pointCount, broker, id) {
    this.id = id || "default";
    this.gl = gl;
    this.pointCount = pointCount;
    this.broker = broker;

    this.program = createProgram(gl, vsSource, fsSource);
    this.vao = createFullscreenVAO(gl, this.program, "aPos");

    this.textures = [gl.createTexture(), gl.createTexture()];
    this.fbos = [gl.createFramebuffer(), gl.createFramebuffer()];
    this.current = 0;

    this.pointsTex = gl.createTexture();

    this._lastPictureValue = 0;
    this._captureBusy = false;
    this._captureSeq = 0;

    this.u = {
      u_resolution: gl.getUniformLocation(this.program, "u_resolution"),
      u_time: gl.getUniformLocation(this.program, "u_time"),
      u_prev: gl.getUniformLocation(this.program, "u_prev"),
      u_pointsTex: gl.getUniformLocation(this.program, "u_pointsTex"),
      u_pointCount: gl.getUniformLocation(this.program, "u_pointCount"),
    };
  }

  resize(w, h) {
    const gl = this.gl;

    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        w,
        h,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[i]);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.textures[i],
        0
      );

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    gl.bindTexture(gl.TEXTURE_2D, this.pointsTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      this.pointCount,
      1,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  uploadSim(payloadRGBAFloat32) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.pointsTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      this.pointCount,
      1,
      gl.RGBA,
      gl.FLOAT,
      payloadRGBAFloat32
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  async _captureFramebufferPNGBlob(fbo, w, h) {
    const gl = this.gl;
    const pixels = new Uint8Array(w * h * 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    flipRowsInPlace(pixels, w, h);

    return await rgbaToPNGBlob(pixels, w, h);
  }

  async _captureSaveAndSendPNG(fbo, w, h) {
    const seq = ++this._captureSeq;
    const startedAt = Date.now();

    console.log("[content capture] begin", {
      seq,
      width: w,
      height: h,
      room: this.id,
    });

    const blob = await this._captureFramebufferPNGBlob(fbo, w, h);

    const meta = {
      width: w,
      height: h,
      mime: blob.type || "image/png",
      size: blob.size,
      room: this.id,
      seq,
    };

    await saveBlobToIndexedDB("latest-content-png", blob, meta);

    console.log("[content capture] saved PNG to IndexedDB", {
      seq,
      width: w,
      height: h,
      bytes: blob.size,
      type: blob.type,
    });

    if (!this.broker || !this.broker.isOpen || !this.broker.isOpen()) {
      console.warn("[content capture] broker not open, PNG saved locally only", {
        seq,
      });
      return;
    }

    const header = {
      type: "image",
      subtype: "content-png",
      from: "shader",
      room: this.id,
      seq,
      mime: blob.type || "image/png",
      width: w,
      height: h,
      size: blob.size,
      ts: Date.now(),
    };

    const okHeader = this.broker.send(header);
    if (!okHeader) {
      console.warn("[content capture] failed to send image header", { seq });
      return;
    }

    const okBlob = this.broker.sendRaw(blob);
    if (!okBlob) {
      console.warn("[content capture] failed to send PNG blob", { seq });
      return;
    }

    console.log("[content capture] sent PNG to controller", {
      seq,
      width: w,
      height: h,
      bytes: blob.size,
      elapsedMs: Date.now() - startedAt,
    });
  }

  render(timeSeconds, w, h) {
    const gl = this.gl;

    const prev = this.current;
    const next = 1 - this.current;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[next]);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[prev]);
    gl.uniform1i(this.u.u_prev, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.pointsTex);
    gl.uniform1i(this.u.u_pointsTex, 1);

    gl.uniform2f(this.u.u_resolution, w, h);
    gl.uniform1f(this.u.u_time, timeSeconds);
    gl.uniform1i(this.u.u_pointCount, this.pointCount);

    updateUniforms(gl, this.program);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const picture = getControl("/virtualctl/picture", 0);
    const risingEdge = picture >= 1 && this._lastPictureValue < 1;

    if (risingEdge && !this._captureBusy) {
      this._captureBusy = true;

      console.log("[content capture] trigger received", {
        path: "/virtualctl/picture",
        value: picture,
        width: w,
        height: h,
        bufferIndex: next,
      });

      this._captureSaveAndSendPNG(this.fbos[next], w, h)
        .catch((err) => {
          console.error("[content capture] failed", err);
        })
        .finally(() => {
          this._captureBusy = false;
        });

      setControl("/virtualctl/picture", 0);
    }

    this._lastPictureValue = picture;

    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.current = next;
  }

  texture() {
    return this.textures[this.current];
  }
}
