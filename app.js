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

const panel = document.getElementById("panel");
const errorBox = document.getElementById("error");
const routeBox = document.getElementById("route");
const pickupEl = document.getElementById("pickup");
const destinationEl = document.getElementById("destination");
const searchMessageEl = document.getElementById("search-message");
const elapsedEl = document.getElementById("elapsed");
const driverEl = document.getElementById("driver-name");
const vehicleEl = document.getElementById("vehicle");
const plateEl = document.getElementById("plate");
const etaEl = document.getElementById("eta");
const bookingRefEl = document.getElementById("booking-reference");
const actionButtons = [...document.querySelectorAll(".btn")];

let search = null;
let version = 0;
let pollInFlight = false;
let actionInFlight = false;
let pollTimer = null;

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
  if (typeof data?.search_id !== "string" || !KNOWN_STATUSES.includes(data.status)) {
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

function render() {
  const view = search ? search.status : "idle";
  panel.dataset.view = view;
  routeBox.hidden = !search;

  panel.querySelectorAll(".view").forEach((section) => {
    section.hidden = section.dataset.for !== view;
  });

  if (!search) return;

  pickupEl.textContent = search.pickup;
  destinationEl.textContent = search.destination;

  if (search.status === "searching") {
    searchMessageEl.textContent = progressMessage(search.elapsed_seconds);
    elapsedEl.textContent = String(search.elapsed_seconds);
  }

  if (search.ride) {
    driverEl.textContent = search.ride.driver_name;
    vehicleEl.textContent = search.ride.vehicle;
    plateEl.textContent = search.ride.plate;
    etaEl.textContent = `${search.ride.eta_minutes} min (simulated)`;
  }

  if (search.status === "booked") {
    bookingRefEl.textContent = search.booking_reference;
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
      search = next;
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

function resetSearch() {
  version += 1;
  search = null;
  clearError();
  render();
  schedulePoll(0);
}

document.getElementById("cancel-button").addEventListener("click", () => runSearchAction("cancel_ride_search"));
document.getElementById("cancel-found-button").addEventListener("click", () => runSearchAction("cancel_ride_search"));
document.getElementById("confirm-button").addEventListener("click", () => runSearchAction("confirm_demo_booking"));
panel.querySelectorAll("[data-reset]").forEach((button) => {
  button.addEventListener("click", resetSearch);
});

const assistantToggle = document.getElementById("assistant-toggle");
const assistantHint = document.getElementById("assistant-hint");
assistantToggle.addEventListener("click", () => {
  const active = assistantToggle.getAttribute("aria-pressed") !== "true";
  assistantToggle.setAttribute("aria-pressed", String(active));
  assistantHint.hidden = !active;
});

render();
schedulePoll(0);
