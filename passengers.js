const STORAGE_KEY = "rekab.passengerCount";
const MIN_PASSENGERS = 1;
const MAX_PASSENGERS = 4;

export { MIN_PASSENGERS, MAX_PASSENGERS };

export function getPassengerCount() {
  const stored = Number.parseInt(localStorage.getItem(STORAGE_KEY), 10);
  if (!Number.isInteger(stored)) return MIN_PASSENGERS;
  return Math.min(MAX_PASSENGERS, Math.max(MIN_PASSENGERS, stored));
}

export function setPassengerCount(count) {
  const clamped = Math.min(MAX_PASSENGERS, Math.max(MIN_PASSENGERS, count));
  localStorage.setItem(STORAGE_KEY, String(clamped));
  return clamped;
}
