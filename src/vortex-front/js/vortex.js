const audio = document.getElementById('audio');
const btn   = document.getElementById('playButton');
const ui    = document.querySelector('.vortex-container');

const STREAM_URL = 'stream.m3u8';

function setState(state) {
  ui.classList.remove('paused', 'playing');
  ui.classList.add(state);
  btn.textContent = state === 'playing' ? '❚❚' : '▶';
}

function initAudio() {
  if (Hls.isSupported()) {
    const hls = new Hls({
      lowLatencyMode: true,
      backBufferLength: 0
    });
    hls.loadSource(STREAM_URL);
    hls.attachMedia(audio);
  } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    audio.src = STREAM_URL;
  }
}

btn.addEventListener('click', async () => {
  if (audio.paused) {
    await audio.play();
  } else {
    audio.pause();
  }
});

audio.addEventListener('play', () => setState('playing'));
audio.addEventListener('pause', () => setState('paused'));
audio.addEventListener('ended', () => setState('paused'));

initAudio();
setState('paused');

/* PWA */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

