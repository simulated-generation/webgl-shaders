function openMediaDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("shader-media-db", 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("videos")) {
        db.createObjectStore("videos");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveVideoBlobToIndexedDB(key, blob, meta = {}) {
  const db = await openMediaDB();

  await new Promise((resolve, reject) => {
    const tx = db.transaction("videos", "readwrite");
    const store = tx.objectStore("videos");

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

function pickVideoMimeType() {
  if (!window.MediaRecorder) return "";

  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return "";
}

export function createCanvasVideoRecorder(canvas, {
  broker = null,
  roomId = "default",
  fps = 60,
  durationMs = 20000,
  dbKey = "latest-video",
} = {}) {
  let recorder = null;
  let stream = null;
  let chunks = [];
  let busy = false;
  let seq = 0;
  let stopTimer = null;

  function stopTracks() {
    if (!stream) return;
    for (const track of stream.getTracks()) {
      track.stop();
    }
    stream = null;
  }

  async function sendVideoBlob(blob, meta) {
    if (!broker || !broker.isOpen || !broker.isOpen()) {
      console.warn("[video] broker not open, video saved locally only");
      return;
    }

    const header = {
      type: "video",
      subtype: "canvas-recording",
      from: "shader",
      room: roomId,
      seq: meta.seq,
      mime: blob.type || "video/webm",
      width: meta.width,
      height: meta.height,
      size: blob.size,
      durationMs: meta.durationMs,
      fps: meta.fps,
      ts: Date.now(),
    };

    const okHeader = broker.send(header);
    if (!okHeader) {
      console.warn("[video] failed to send video header");
      return;
    }

    const okBlob = broker.sendRaw(blob);
    if (!okBlob) {
      console.warn("[video] failed to send video blob");
      return;
    }

    console.log("[video] sent to broker", header);
  }

  async function start() {
    if (busy) {
      console.log("[video] already recording");
      return false;
    }

    if (!window.MediaRecorder) {
      console.warn("[video] MediaRecorder unavailable");
      return false;
    }

    const mimeType = pickVideoMimeType();
    console.log("[video] chosen mime:", mimeType || "(browser default)");

    try {
      stream = canvas.captureStream(fps);
    } catch (err) {
      console.error("[video] captureStream failed", err);
      return false;
    }

    chunks = [];
    busy = true;
    seq += 1;

    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (err) {
      console.error("[video] MediaRecorder init failed", err);
      stopTracks();
      busy = false;
      return false;
    }

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = (event) => {
      console.error("[video] recorder error", event);
    };

    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunks, {
          type: recorder.mimeType || mimeType || "video/webm",
        });

        const meta = {
          seq,
          mime: blob.type,
          size: blob.size,
          durationMs,
          fps,
          width: canvas.width,
          height: canvas.height,
        };

        await saveVideoBlobToIndexedDB(dbKey, blob, meta);
        console.log("[video] saved to IndexedDB", meta);

        await sendVideoBlob(blob, meta);
      } catch (err) {
        console.error("[video] save/send failed", err);
      } finally {
        if (stopTimer) {
          clearTimeout(stopTimer);
          stopTimer = null;
        }
        stopTracks();
        recorder = null;
        chunks = [];
        busy = false;
      }
    };

    recorder.start();

    console.log("[video] recording started", {
      seq,
      fps,
      durationMs,
      width: canvas.width,
      height: canvas.height,
      mime: mimeType || "(browser default)",
    });

    stopTimer = setTimeout(() => {
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    }, durationMs);

    return true;
  }

  return {
    start,
    isBusy() {
      return busy;
    },
  };
}
