import { RetellClient } from "https://cdn.jsdelivr.net/npm/retell-client-js-sdk@3.0.3/+esm";

import { getPassengerCount } from "./passengers.js";

const PUBLIC_KEY = "public_key_b4166767a591c51e7a37d";
const AGENT_ID = "agent_d2cd2d0a39ed74e304a68f29ad";

const client = new RetellClient({ key: PUBLIC_KEY });
let session = null;
let activeHandlers = null;

function audioLevel(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.min(1, Math.sqrt(sum / samples.length) * 6);
}

function finish() {
  if (!session) return;
  session = null;
  const handlers = activeHandlers;
  activeHandlers = null;
  handlers.onEnd();
}

export function startVoiceCall(handlers) {
  if (session) return;
  activeHandlers = handlers;
  try {
    session = client.createWebCall({
      agent_id: AGENT_ID,
      retell_llm_dynamic_variables: { passenger_count: String(getPassengerCount()) },
      audio: { emitRawAudioSamples: true },
      hooks: {
        onStatus: (status) => handlers.onStatus(status),
        onAudio: (samples) => handlers.onLevel(audioLevel(samples)),
        onEnd: () => finish(),
        onError: (err) => handlers.onError(err),
      },
    });
    session.ready?.catch(() => {});
  } catch (err) {
    session = null;
    activeHandlers = null;
    handlers.onError(err);
    handlers.onEnd();
  }
}

export async function endVoiceCall() {
  if (!session) return;
  const current = session;
  try {
    await current.end();
  } catch {
    // The session is cleared below either way; a failed hang-up must not leave the button stuck.
  }
  finish();
}
