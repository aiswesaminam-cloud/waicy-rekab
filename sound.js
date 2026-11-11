const RIDE_FOUND_BURST = [
  [659, 0.14, 0],
  [784, 0.14, 0.16],
  [988, 0.22, 0.32],
];
const RIDE_FOUND_REPEATS = 3;
const RIDE_FOUND_PERIOD_SECONDS = 1;
const PEAK_GAIN = 0.3;

const TONES = {
  callLive: [
    [660, 0.12, 0],
    [880, 0.14, 0.14],
  ],
  searchStarted: [[523, 0.14, 0]],
  rideFound: Array.from({ length: RIDE_FOUND_REPEATS }, (_, repeat) =>
    RIDE_FOUND_BURST.map(([frequency, duration, offset]) => [
      frequency,
      duration,
      offset + repeat * RIDE_FOUND_PERIOD_SECONDS,
    ]),
  ).flat(),
  bookingConfirmed: [
    [523, 0.14, 0],
    [659, 0.14, 0.16],
    [784, 0.14, 0.32],
    [1047, 0.3, 0.48],
  ],
};

const muteButton = document.getElementById("sound-toggle");
let audio = null;
let muted = false;

function getAudio() {
  if (!audio) {
    const context = new AudioContext();
    const output = context.createDynamicsCompressor();
    output.connect(context.destination);
    audio = { context, output };
  }
  return audio;
}

export function playCue(name) {
  const tones = TONES[name];
  if (muted || !tones || !window.AudioContext) return;
  const { context, output } = getAudio();
  if (context.state === "suspended") context.resume();
  const start = context.currentTime;
  for (const [frequency, duration, offset] of tones) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, start + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
    oscillator.connect(gain).connect(output);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + duration);
  }
}

muteButton.addEventListener("click", () => {
  muted = !muted;
  muteButton.setAttribute("aria-pressed", String(muted));
  muteButton.textContent = muted ? "Sound off" : "Sound on";
});
