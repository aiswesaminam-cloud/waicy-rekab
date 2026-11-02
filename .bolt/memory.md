# Project memory

## Product intent & audience

- Rekab AI is a voice-assisted ride-booking demo for desktop and mobile visitors.
- The experience should visibly reflect the real ride-search lifecycle rather than showing frontend-only success animations.
- Demo flow supports searching, finding a ride, cancelling, and confirming a booking.

## Brand personality & voice

- Minimal, professional, modern, and trustworthy.
- Rekab-inspired monochrome presentation: black, white, and light grey.
- Interface copy should be concise and status-oriented, clearly communicating what the ride agent is doing.

## Visual design & UX direction

- Preserve the existing Retell voice widget and overall site functionality.
- Booking UI should include clear visual states for idle, listening, processing, searching, ride found, cancelled, and confirmed where technically supported.
- Prefer smooth, polished transitions and restrained animation over decorative motion.
- The Rekab-AI control belongs beside the passenger option and should retain matching dimensions and styling; activation is intended to separate the letters and reveal a waveform.
- Ride-search UI currently supports animated searching feedback, elapsed time, ride-found details, cancelled state, and booking confirmation.
- Ride-found presentation includes fictional driver, vehicle, plate, and ETA data returned by the backend.
- Keep the layout responsive and suitable for GitHub Pages deployment.
- Accessibility and clarity should take priority over animation; status changes must remain understandable without relying only on motion.

## Decisions, constraints & rationale

- The deployed backend remains the source of truth and is not to be replaced. Base endpoint: `https://blvggoxdruqoeuuhqbdh.supabase.co/functions/v1/ride-demo`.
- Existing backend operations used by the UI: `start_ride_search`, `check_search_status`, `cancel_ride_search`, and `confirm_demo_booking`.
- The frontend uses the `search_id` returned by `start_ride_search` and polls `check_search_status`; polling stops when the search is cancelled or otherwise terminal.
- The page also polls a read-only `get_latest_search` operation because the Retell widget does not expose usable tool-call or agent lifecycle callbacks to the host page. This is the current synchronization fallback.
- The Retell widget is a closed script with setup attributes only; it must remain in place, with its agent ID and public key unchanged. Private keys must never be exposed.
- The current fallback can show the latest active search from any visitor, so it is appropriate for a one-demo-at-a-time environment but is not isolated per visitor.
- Polling/action code includes a version guard so stale asynchronous responses cannot overwrite newer cancel or booking actions.
- A real backend search was verified over HTTPS, including an active search initiated through the Retell agent.
- The widget script was moved inside the document body to avoid quirks mode, without changing the widget itself.
- The page was not browser-tested in the implementation environment; GitHub Pages validation remains necessary.
- The original project did not contain the requested Rekab-AI button, letter-separation animation, or waveform implementation. These remain follow-up work rather than reasons to replace the project.

## Open questions & assumptions

- Confirm whether the current backend deployment includes the added `get_latest_search` operation in the production environment used by GitHub Pages.
- Determine whether a reliable per-session or per-visitor search association is needed beyond the current single-demo fallback.
- Investigate whether a future Retell integration method can expose listening/processing/tool events without replacing the widget.
- Browser-test the complete flow on GitHub Pages, including voice request, search start, status transitions, cancellation, confirmation, refreshes, and mobile layout.
- Verify exact backend response shapes and terminal status names against production data, especially for cancelled and confirmed searches.