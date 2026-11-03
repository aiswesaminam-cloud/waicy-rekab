import { createAvailability } from "./availability.js";
import { playCue } from "./sound.js";

const API_BASE = "https://blvggoxdruqoeuuhqbdh.supabase.co/functions/v1/ride-demo";
const ACTIVE_STATUSES = ["searching", "ride_found"];
const KNOWN_STATUSES = ["searching", "ride_found", "cancelled", "booked"];
const POLL_DELAY_MS = { searching: 1500, ride_found: 3000, idle: 2000 };
const PROGRESS_MESSAGES = [
  "Looking for available rides...",
  "Checking nearby availability...",
  "Finding a suitable ride...",
  "Almost there...",
];
const BOOKING_FADE_OUT_MS = 350;
const STATUS_CUES = { searching: "searchStarted", ride_found: "rideFound" };

const panel = document.getElementById("panel");
const errorBox = document.getElementById("error");
const routeBox = document.getElementById("route");
const pickupEl = document.getElementById("pickup");
const destinationEl = document.getElementById("destination");
const searchMessageEl = document.getElementById("search-message");
const elapsedEl = document.getElementById("elapsed");
const availabilityWaitEl = document.getElementById("availability-wait");
const availabilityMinutesEl = document.getElementById("availability-minutes");
const availabilityArrivalEl = document.getElementById("availability-arrival");
const bookingPickupEl = document.getElementById("booking-pickup");
const bookingDestinationEl = document.getElementById("booking-destination");
const bookingRefEl = document.getElementById("booking-reference");
const actionButtons = [...document.querySelectorAll(".btn")];

let search = null;
let version = 0;
let pollInFlight = false;
let actionInFlight = false;
let pollTimer = null;
let bookingStage = null;
let availability = null;
let availabilitySearchId = null;

class ServiceError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function callApi(action, payload = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ServiceError("Could not reach the ride service. Retrying...");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ServiceError("The ride service sent an unexpected response.");
  }

  if (!response.ok || data?.success !== true) {
    throw new ServiceError(
      data?.error?.message ?? "The ride service returned an error.",
      data?.error?.code,
    );
  }
  return data;
}

function toSearch(data) {
  if (
    typeof data?.search_id !== "string" ||
    !KNOWN_STATUSES.includes(data.status)
  ) {
    throw new ServiceError("The ride service sent an unexpected response.");
  }
  return data;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function setActionsDisabled(disabled) {
  actionButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

function progressMessage(elapsedSeconds) {
  const index = Math.min(PROGRESS_MESSAGES.length - 1, Math.floor(elapsedSeconds / 3));
  return PROGRESS_MESSAGES[index];
}

function currentView() {
  if (!search) return "idle";
  if (search.status === "booked" || bookingStage === "pending") return "booking";
  return search.status;
}

function renderAvailability() {
  if (availabilitySearchId !== search.search_id) {
    availability = createAvailability();
    availabilitySearchId = search.search_id;
  }
  availabilityWaitEl.textContent = `${availability.waitMinutes} min`;
  availabilityMinutesEl.textContent = `${availability.pickupMinutes} min`;
  availabilityArrivalEl.textContent = availability.arrivalText;
}

function render() {
  const view = currentView();
  panel.dataset.view = view;
  panel.dataset.phase = search?.status === "booked" ? "confirmed" : "booking";
  routeBox.hidden = !search;

  panel.querySelectorAll(".view").forEach((section) => {
    const active = section.dataset.for === view;
    section.hidden = !active;
    section.classList.toggle("is-leaving", active && bookingStage === "leaving");
  });

  if (!search) return;

  pickupEl.textContent = search.pickup;
  destinationEl.textContent = search.destination;

  if (search.status === "searching") {
    searchMessageEl.textContent = progressMessage(search.elapsed_seconds);
    elapsedEl.textContent = String(search.elapsed_seconds);
  }

  if (search.status === "ride_found") {
    renderAvailability();
  }

  if (view === "booking") {
    bookingPickupEl.textContent = search.pickup;
    bookingDestinationEl.textContent = search.destination;
    bookingRefEl.textContent = search.booking_reference ?? "";
  }
}

function schedulePoll(delay) {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(poll, delay);
}

function nextPollDelay() {
  if (!search || !ACTIVE_STATUSES.includes(search.status)) return POLL_DELAY_MS.idle;
  return POLL_DELAY_MS[search.status];
}

async function fetchCurrentSearch() {
  if (search && ACTIVE_STATUSES.includes(search.status)) {
    return toSearch(await callApi("check_search_status", { search_id: search.search_id }));
  }
  const data = await callApi("get_latest_search");
  return data.search === null ? search : toSearch(data.search);
}

async function poll() {
  if (pollInFlight) return;
  pollInFlight = true;
  const startVersion = version;
  try {
    const next = await fetchCurrentSearch();
    if (startVersion === version) {
      const previousStatus = search?.status;
      search = next;
      const cue = STATUS_CUES[next?.status];
      if (previousStatus && cue && previousStatus !== next.status) playCue(cue);
      clearError();
    }
  } catch (err) {
    if (startVersion === version) {
      if (err instanceof ServiceError && err.code === "search_not_found") {
        search = null;
      }
      showError(err.message);
    }
  } finally {
    pollInFlight = false;
  }
  render();
  schedulePoll(nextPollDelay());
}

async function runSearchAction(action) {
  if (actionInFlight || !search) return;
  actionInFlight = true;
  setActionsDisabled(true);
  try {
    const data = await callApi(action, { search_id: search.search_id });
    version += 1;
    search = toSearch(data);
    clearError();
  } catch (err) {
    showError(err.message);
  } finally {
    actionInFlight = false;
    setActionsDisabled(false);
    render();
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function bookRide() {
  if (actionInFlight || search?.status !== "ride_found") return;
  const searchId = search.search_id;
  actionInFlight = true;
  setActionsDisabled(true);
  bookingStage = "leaving";
  render();

  const request = callApi("confirm_demo_booking", {
    search_id: searchId,
  }).then(
    (data) => ({ ok: true, search: toSearch(data) }),
    (err) => ({ ok: false, err }),
  );

  await sleep(BOOKING_FADE_OUT_MS);
  bookingStage = "pending";
  render();

  const result = await request;
  bookingStage = null;
  if (result.ok) {
    version += 1;
    search = result.search;
    clearError();
    playCue("bookingConfirmed");
  } else {
    showError(result.err.message);
  }
  actionInFlight = false;
  setActionsDisabled(false);
  render();
}

function resetSearch() {
  version += 1;
  search = null;
  clearError();
  render();
  schedulePoll(0);
}

document.getElementById("cancel-button").addEventListener("click", () => runSearchAction("cancel_ride_search"));
document.getElementById("cancel-found-button").addEventListener("click", () => runSearchAction("cancel_ride_search"));
document.getElementById("book-button").addEventListener("click", bookRide);
panel.querySelectorAll("[data-reset]").forEach((button) => {
  button.addEventListener("click", resetSearch);
});

render();
schedulePoll(0);
