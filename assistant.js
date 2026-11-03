import { startVoiceCall, endVoiceCall } from "./voice.js";

const toggle = document.getElementById("assistant-toggle");
const statusEl = document.getElementById("assistant-status");

const CALL_STATES = ["connecting", "live", "speaking"];
const STATUS_TEXT = {
  idle: "Tap Rekab AI to talk to the ride assistant.",
  connecting: "Connecting to Rekab AI...",
  live: "Listening. Say your pickup and destination.",
  speaking: "Rekab AI is speaking...",
  ending: "Ending call...",
  ended: "Call ended. Tap Rekab AI to start again.",
  error: "The call could not continue. Tap Rekab AI to try again.",
};

let state = "idle";

function setState(next) {
  state = next;
  toggle.dataset.state = next;
  toggle.setAttribute("aria-pressed", String(CALL_STATES.includes(next)));
  toggle.disabled = next === "ending";
  statusEl.textContent = STATUS_TEXT[next];
  if (!CALL_STATES.includes(next)) toggle.style.setProperty("--level", "0");
}

function handleStatus(status) {
  if (status === "connecting") setState("connecting");
  if (status === "live" && state === "connecting") setState("live");
  if (status === "ended" && state !== "error") setState("ended");
}

function handleLevel(level) {
  if (CALL_STATES.includes(state)) toggle.style.setProperty("--level", level.toFixed(3));
}

function handleAgentTalking(talking) {
  if (state === "live" || state === "speaking") setState(talking ? "speaking" : "live");
}

function handleEnd() {
  if (state !== "error") setState("ended");
}

function handleError() {
  setState("error");
  endVoiceCall();
}

toggle.addEventListener("click", async () => {
  if (state === "ending") return;
  if (CALL_STATES.includes(state)) {
    setState("ending");
    await endVoiceCall();
    setState("ended");
    return;
  }
  setState("connecting");
  startVoiceCall({
    onStatus: handleStatus,
    onLevel: handleLevel,
    onAgentTalking: handleAgentTalking,
    onEnd: handleEnd,
    onError: handleError,
  });
});

setState("idle");
