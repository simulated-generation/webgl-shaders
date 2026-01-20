const audio = document.getElementById('audio'); 
const btn   = document.getElementById('playButton');
const ui    = document.querySelector('.vortex-container');
const statusText = document.getElementById('status-text');
                                                
const STREAM_URL = 'stream.m3u8';  

/**
 * Updates the UI visual state and text
 */
function setState(state) {
    ui.classList.remove('paused', 'playing');
    ui.classList.add(state);
    
    // Updates the Play/Pause icon
    btn.textContent = state === 'playing' ? '❚❚' : '▶';
    
    // Updates the discreet status text
    statusText.textContent = state === 'playing' ? 'PLAYING' : 'PAUSED';
}

/**
 * Initializes the HLS stream
 */
function initAudio() {
    if (Hls.isSupported()) {
        const hls = new Hls({
            lowLatencyMode: true,
            backBufferLength: 0
        });
        hls.loadSource(STREAM_URL);
        hls.attachMedia(audio);
    } 
    // For Safari/iOS which supports HLS natively
    else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = STREAM_URL;
    }
}

// User Interaction
btn.addEventListener('click', async () => {
    try {
        if (audio.paused) {
            await audio.play();
        } else {
            audio.pause();
        }
    } catch (err) {
        console.error("Playback interaction failed:", err);
    }
});

// Event Listeners for State Management
audio.addEventListener('play', () => setState('playing'));
audio.addEventListener('pause', () => setState('paused'));
audio.addEventListener('ended', () => setState('paused'));

// Initial Load
initAudio();
setState('paused');

/* PWA Service Worker Registration */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('SW registration failed: ', err);
        });
    });
}
