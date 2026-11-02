/*
# Create simulated ride searches table

Plain-English summary: stores the demo ride searches that the Retell voice agent starts, checks, cancels and confirms. Every row is fictional demo data; nothing here connects to real Rekab services or real drivers.

1. New Tables
- `ride_demo_searches`
  - `id` (uuid, primary key): the search_id returned to the voice agent.
  - `pickup` (text): pickup location as spoken by the user.
  - `destination` (text): destination as spoken by the user.
  - `status` (text): one of searching, ride_found, cancelled, booked.
  - `ready_at` (timestamptz): time at which the simulated search finds a ride.
  - `driver_name`, `vehicle`, `plate`, `eta_minutes`: fictional ride details, filled when a ride is found.
  - `booking_reference` (text): fictional reference, filled when a booking is confirmed.
  - `created_at`, `updated_at` (timestamptz).

2. Security
- Row level security is enabled and no policies are granted to anon or authenticated, so browsers cannot read or write this table directly.
- Only the server function (service role) can access it, via a grant to service_role.

3. Important notes
- The statements are idempotent and safe to re-run.
*/

CREATE TABLE IF NOT EXISTS ride_demo_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup text NOT NULL,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'searching' CHECK (status IN ('searching', 'ride_found', 'cancelled', 'booked')),
  ready_at timestamptz NOT NULL,
  driver_name text,
  vehicle text,
  plate text,
  eta_minutes integer,
  booking_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ride_demo_searches ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON ride_demo_searches TO service_role;
