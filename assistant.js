import { startVoiceCall, endVoiceCall } from "./voice.js";

const toggle = document.getElementById("assistant-toggle");
const statusEl = document.getElementById("assistant-status");
const endButton = document.getElementById("end-call-button");

const IDLE_STATES = ["idle", "ended", "error"];
const STATUS_TEXT = {
  idle: "Tap Rekab-AI to talk to the ride assistant.",
  connecting: "Connecting to Rekab AI...",
  live: "Listening. Say your pickup and destination.",
  ending: "Ending call...",
  ended: "Call ended. Tap Rekab-AI to start again.",
  error: "The call could not continue. Tap Rekab-AI to try again.",
};

let state = "idle";

function setState(next) {
  state = next;
  toggle.dataset.state = next;
  const inCall = next === "connecting" || next === "live";
  toggle.setAttribute("aria-pressed", String(inCall));
  toggle.disabled = !IDLE_STATES.includes(next);
  endButton.hidden = !inCall;
  endButton.disabled = next === "ending";
  statusEl.textContent = STATUS_TEXT[next];
  if (!inCall) toggle.style.setProperty("--level", "0");
}

function handleStatus(status) {
  if (status === "connecting") setState("connecting");
  if (status === "live") setState("live");
}

function handleLevel(level) {
  if (state === "live") toggle.style.setProperty("--level", level.toFixed(3));
}

function handleEnd() {
  if (state !== "error") setState("ended");
}

function handleError() {
  endVoiceCall();
  setState("error");
}

toggle.addEventListener("click", () => {
  if (!IDLE_STATES.includes(state)) return;
  setState("connecting");
  startVoiceCall({
    onStatus: handleStatus,
    onLevel: handleLevel,
    onEnd: handleEnd,
    onError: handleError,
  });
});

endButton.addEventListener("click", async () => {
  if (state !== "connecting" && state !== "live") return;
  setState("ending");
  await endVoiceCall();
});

setState("idle");
