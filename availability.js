const WAIT_MINUTES_RANGE = [20, 31];
const PICKUP_MINUTES_RANGE = [1, 10];

function randomBetween([min, max]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function createAvailability(now = new Date()) {
  const pickupMinutes = randomBetween(PICKUP_MINUTES_RANGE);
  const arrival = new Date(now.getTime() + pickupMinutes * 60 * 1000);
  return {
    waitMinutes: randomBetween(WAIT_MINUTES_RANGE),
    pickupMinutes,
    arrivalText: arrival.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}
