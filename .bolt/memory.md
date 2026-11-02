# Project memory

## Product intent & audience

- Rekab AI is a voice-assisted ride-booking demo for desktop and mobile visitors.
- The experience should reflect the ride-search lifecycle: searching, finding, cancelling, and confirming a booking.
- The interface now includes an interactive Rekab-AI entry point intended to direct users toward the voice agent.

## Brand personality & voice

- Minimal, professional, modern, and trustworthy.
- Rekab-inspired monochrome presentation using black, white, and light grey.
- Copy should remain concise and status-oriented, clearly explaining what the ride agent or interface is doing.

## Visual design & UX direction

- Preserve the existing Retell voice widget and overall site functionality.
- Booking UI should communicate idle, listening, processing, searching, ride found, cancelled, and confirmed states where technically supported.
- Prefer smooth, restrained transitions over decorative motion; status changes must remain understandable without animation.
- The Rekab-AI control is currently positioned above the ride panel because the project has no passenger-option layout to place it beside.
- The control is a black-and-white pill. Activation spreads the “Rekab-AI” lettering, reveals an animated waveform, and displays a hint directing users to tap “Talk to Rekab AI” in the corner. Tapping again returns it to the default state.
- The waveform indicates only that the control is active; it is not synchronized with actual Retell listening or speech state.
- Ride-search UI supports animated searching feedback, elapsed time, ride-found details, cancellation, and booking confirmation.
- Ride-found presentation uses fictional driver, vehicle, plate, and ETA data returned by the backend.
- Keep the layout responsive and suitable for GitHub Pages deployment.

## Decisions, constraints & rationale

- The deployed backend remains the source of truth and is not to be replaced. Base endpoint: `https://blvggoxdruqoeuuhqbdh.supabase.co/functions/v1/ride-demo`.
- Existing backend operations used by the UI: `start_ride_search`, `check_search_status`, `cancel_ride_search`, and `confirm_demo_booking`.
- The frontend uses the `search_id` returned by `start_ride_search` and polls `check_search_status`; polling stops when the search is cancelled or otherwise terminal.
- The page also polls read-only `get_latest_search` because the Retell widget does not expose usable tool-call or agent lifecycle callbacks to the host page. This is a synchronization fallback and can surface another visitor’s latest active search in a one-demo-at-a-time environment.
- Polling/action code uses a version guard so stale asynchronous responses cannot overwrite newer cancellation or booking actions.
- The Retell widget is a closed script with setup attributes only and must remain in place with its existing agent ID and public key. Private keys must never be exposed.
- The Rekab-AI control and letter-separation/waveform interaction have been added without replacing the existing project or widget.
- The control’s visual animation cannot currently represent real agent listening because the widget exposes no corresponding lifecycle events.
- Syntax wiring was checked, but the page was not browser-tested in the implementation environment.

## Open questions & assumptions

- Browser-test the Rekab-AI animation, hint placement, full ride flow, refresh behavior, and mobile layout on GitHub Pages.
- Confirm whether the production backend used by GitHub Pages includes `get_latest_search`.
- Determine whether per-session or per-visitor search association is needed beyond the current single-demo fallback.
- Investigate whether a future Retell integration can expose listening, processing, or tool-call events without replacing the widget.
- Verify exact backend response shapes and terminal status names against production data, especially cancellation and confirmation.