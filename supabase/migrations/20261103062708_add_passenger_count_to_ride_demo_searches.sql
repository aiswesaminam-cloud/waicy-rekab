/*
# Add passenger count to simulated ride searches

Plain-English summary: records how many passengers a simulated ride is booked for. Existing rows default to one passenger.

1. Modified Tables
- `ride_demo_searches`
  - New column `passenger_count` (integer, not null, default 1, must be between 1 and 4).

2. Security
- No change to row level security or grants. Only the server function reads and writes this table.

3. Important notes
- Adding a column with a default does not change or remove any existing data.
- The statement is idempotent and safe to re-run.
*/

ALTER TABLE ride_demo_searches
  ADD COLUMN IF NOT EXISTS passenger_count integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ride_demo_searches_passenger_count_check'
  ) THEN
    ALTER TABLE ride_demo_searches
      ADD CONSTRAINT ride_demo_searches_passenger_count_check CHECK (passenger_count BETWEEN 1 AND 4);
  END IF;
END $$;
