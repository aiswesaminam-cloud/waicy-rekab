import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TABLE = "ride_demo_searches";
const ACTIONS = ["start_ride_search", "check_search_status", "cancel_ride_search", "confirm_demo_booking", "get_latest_search"];
const ACTIVE_WINDOW_MINUTES = 10;
const MAX_PASSENGERS = 4;
const DRIVER_NAMES = ["Omar A.", "Layla M.", "Khalid R.", "Sara N.", "Youssef T.", "Mariam H.", "Tariq S.", "Noor F."];
const VEHICLES = ["Silver Toyota Corolla", "White Hyundai Elantra", "Black Kia Cerato", "Grey Nissan Sunny", "Blue Honda Civic"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class DemoError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

type SearchRow = {
  id: string;
  pickup: string;
  destination: string;
  status: "searching" | "ride_found" | "cancelled" | "booked";
  ready_at: string;
  driver_name: string | null;
  vehicle: string | null;
  plate: string | null;
  eta_minutes: number | null;
  booking_reference: string | null;
  passenger_count: number;
  created_at: string;
};

const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function failure(status: number, code: string, message: string) {
  return json({ success: false, simulated: true, error: { code, message } }, status);
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function readLocation(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new DemoError(400, "invalid_input", `"${field}" must be text.`);
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < 3 || trimmed.length > 200) {
    throw new DemoError(400, "invalid_input", `"${field}" must be between 3 and 200 characters.`);
  }
  return trimmed;
}

function readPassengerCount(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > MAX_PASSENGERS) {
    throw new DemoError(400, "invalid_input", `"passenger_count" must be a whole number from 1 to ${MAX_PASSENGERS}.`);
  }
  return value;
}

function readSearchId(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new DemoError(400, "invalid_input", '"search_id" must be a valid search ID.');
  }
  return value;
}

async function loadSearch(searchId: string): Promise<SearchRow> {
  const { data, error } = await db.from(TABLE).select("*").eq("id", searchId).maybeSingle();
  if (error) throw error;
  if (!data) throw new DemoError(404, "search_not_found", "No ride search matches that search ID.");
  return data as SearchRow;
}

// Moves a search to ride_found once its simulated delay has passed. The conditional
// update means concurrent status checks can never assign two different drivers.
async function advanceIfReady(row: SearchRow): Promise<SearchRow> {
  if (row.status !== "searching" || new Date(row.ready_at).getTime() > Date.now()) {
    return row;
  }
  const { data, error } = await db
    .from(TABLE)
    .update({
      status: "ride_found",
      driver_name: pick(DRIVER_NAMES),
      vehicle: pick(VEHICLES),
      plate: `DEMO-${randomInt(1000, 9999)}`,
      eta_minutes: randomInt(3, 12),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "searching")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? (data as SearchRow) : loadSearch(row.id);
}

const STATUS_MESSAGES: Record<SearchRow["status"], string> = {
  searching: "Looking for available simulated rides.",
  ride_found: "A simulated ride has been found.",
  cancelled: "This simulated search was cancelled.",
  booked: "This simulated ride is booked.",
};

function searchSummary(row: SearchRow) {
  const summary: Record<string, unknown> = {
    search_id: row.id,
    status: row.status,
    pickup: row.pickup,
    destination: row.destination,
    elapsed_seconds: Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 1000)),
    message: STATUS_MESSAGES[row.status],
    passenger_count: row.passenger_count,
  };
  if (row.status === "ride_found" || row.status === "booked") {
    summary.ride = {
      driver_name: row.driver_name,
      vehicle: row.vehicle,
      plate: row.plate,
      eta_minutes: row.eta_minutes,
      simulated: true,
    };
  }
  if (row.status === "booked") {
    summary.booking_reference = row.booking_reference;
  }
  return summary;
}

async function startRideSearch(body: Record<string, unknown>) {
  const pickup = readLocation(body.pickup, "pickup");
  const destination = readLocation(body.destination, "destination");
  if (pickup.toLowerCase() === destination.toLowerCase()) {
    throw new DemoError(400, "invalid_input", "Pickup and destination must be different.");
  }
  const passengerCount = readPassengerCount(body.passenger_count, 1);
  const readyAt = new Date(Date.now() + randomInt(6, 9) * 1000).toISOString();
  const { data, error } = await db
    .from(TABLE)
    .insert({ pickup, destination, status: "searching", ready_at: readyAt, passenger_count: passengerCount })
    .select("*")
    .single();
  if (error) throw error;
  return json({ success: true, ...searchSummary(data as SearchRow) });
}

async function checkSearchStatus(body: Record<string, unknown>) {
  const row = await advanceIfReady(await loadSearch(readSearchId(body.search_id)));
  return json({ success: true, ...searchSummary(row) });
}

async function cancelRideSearch(body: Record<string, unknown>) {
  const row = await loadSearch(readSearchId(body.search_id));
  if (row.status === "booked") {
    throw new DemoError(409, "already_booked", "This simulated ride is already booked and cannot be cancelled.");
  }
  if (row.status === "cancelled") {
    return json({ success: true, ...searchSummary(row) });
  }
  const { data, error } = await db
    .from(TABLE)
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .neq("status", "booked")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  const updated = data ? (data as SearchRow) : await loadSearch(row.id);
  return json({ success: true, ...searchSummary(updated) });
}

async function confirmDemoBooking(body: Record<string, unknown>) {
  const row = await advanceIfReady(await loadSearch(readSearchId(body.search_id)));
  if (row.status === "booked") {
    return json({ success: true, ...searchSummary(row) });
  }
  if (row.status === "cancelled") {
    throw new DemoError(409, "search_cancelled", "This search was cancelled, so no booking can be confirmed.");
  }
  if (row.status === "searching") {
    throw new DemoError(409, "ride_not_found_yet", "No simulated ride has been found yet. Please wait for the search to finish.");
  }
  const passengerCount = readPassengerCount(body.passenger_count, row.passenger_count);
  const bookingReference = `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { data, error } = await db
    .from(TABLE)
    .update({
      status: "booked",
      booking_reference: bookingReference,
      passenger_count: passengerCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "ride_found")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  const updated = data ? (data as SearchRow) : await loadSearch(row.id);
  return json({ success: true, ...searchSummary(updated) });
}

async function getLatestSearch() {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .in("status", ["searching", "ride_found"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return json({ success: true, simulated: true, search: null });
  const row = await advanceIfReady(data as SearchRow);
  return json({ success: true, simulated: true, search: searchSummary(row) });
}

const HANDLERS: Record<string, (body: Record<string, unknown>) => Promise<Response>> = {
  start_ride_search: startRideSearch,
  check_search_status: checkSearchStatus,
  cancel_ride_search: cancelRideSearch,
  confirm_demo_booking: confirmDemoBooking,
  get_latest_search: getLatestSearch,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return failure(405, "method_not_allowed", "Use POST to call this demo.");
    }

    let parsed: unknown;
    try {
      parsed = await req.json();
    } catch {
      return failure(400, "invalid_json", "The request body must be valid JSON.");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return failure(400, "invalid_input", "The request body must be a JSON object.");
    }
    const body = parsed as Record<string, unknown>;

    const lastSegment = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
    const action = ACTIONS.includes(lastSegment)
      ? lastSegment
      : typeof body.action === "string" ? body.action : "";
    const handler = HANDLERS[action];
    if (!handler) {
      return failure(404, "unknown_action", "Unknown action. Use start_ride_search, check_search_status, cancel_ride_search or confirm_demo_booking.");
    }

    return await handler(body);
  } catch (err) {
    if (err instanceof DemoError) {
      return failure(err.status, err.code, err.message);
    }
    console.error("ride-demo failed:", err);
    return failure(500, "server_error", "Something went wrong with the simulated search. Please try again.");
  }
});
