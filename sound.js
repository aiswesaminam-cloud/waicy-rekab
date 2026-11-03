const TONES = {
  callLive: [
    [660, 0.12, 0],
    [880, 0.14, 0.14],
  ],
  searchStarted: [[523, 0.14, 0]],
  rideFound: [
    [659, 0.14, 0],
    [784, 0.14, 0.16],
    [988, 0.22, 0.32],
  ],
  bookingConfirmed: [
    [523, 0.14, 0],
    [659, 0.14, 0.16],
    [784, 0.14, 0.32],
    [1047, 0.3, 0.48],
  ],
};

const muteButton = document.getElementById("sound-toggle");
let audioContext = null;
let muted = false;

function getAudioContext() {
  audioContext ??= new AudioContext();
  return audioContext;
}

export function playCue(name) {
  const tones = TONES[name];
  if (muted || !tones || !window.AudioContext) return;
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();
  const start = ctx.currentTime;
  for (const [frequency, duration, offset] of tones) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.15, start + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + duration);
  }
}

muteButton.addEventListener("click", () => {
  muted = !muted;
  muteButton.setAttribute("aria-pressed", String(muted));
  muteButton.textContent = muted ? "Sound off" : "Sound on";
});
