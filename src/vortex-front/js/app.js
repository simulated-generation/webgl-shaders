const audio = document.getElementById("audio");
const playBtn = document.getElementById("play-btn");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const statusText = document.getElementById("status-text");

const streamUrl = "/hls/stream.m3u8"; 
let isPlaying = false;

function togglePlayback() {
    if (isPlaying) {
        pauseStream();
    } else {
        playStream();
    }
}

function playStream() {
    // Only set source if not already set to avoid re-buffering
    if (!audio.src || audio.src === "") {
        audio.src = streamUrl;
    }

    statusText.textContent = "CONNECTING...";
    
    audio.play()
        .then(() => {
            document.body.classList.add("playing");
            isPlaying = true;
            updateUI(true);
        })
        .catch(err => {
            console.error("Playback failed:", err);
            statusText.textContent = "ERROR";
        });
}

function pauseStream() {
    audio.pause();
    document.body.classList.remove("playing");
    isPlaying = false;
    updateUI(false);
}

function updateUI(playing) {
    if (playing) {
        playIcon.style.display = "none";
        pauseIcon.style.display = "block";
        statusText.textContent = "LIVE";
    } else {
        playIcon.style.display = "block";
        pauseIcon.style.display = "none";
        statusText.textContent = "IDLE";
    }
}

// Event Listeners
playBtn.addEventListener("click", togglePlayback);

// Audio State Listeners for better UX
audio.addEventListener("waiting", () => {
    statusText.textContent = "BUFFERING...";
});

audio.addEventListener("playing", () => {
    statusText.textContent = "LIVE";
});

audio.addEventListener("error", () => {
    statusText.textContent = "STREAM OFFLINE";
    document.body.classList.remove("playing");
});
