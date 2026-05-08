## Scope

Make tiles user-managed. Each tile is just a number `n` in the user's account; the ESP32 reports events tagged `tile_<n>` and the dashboard lights that tile up when a recent event comes in.

## 1. Database

New table `user_tiles`:
- `user_id uuid` (auth.users)
- `tile_number int` (1..n, user-chosen)
- `label text` (nullable, defaults to `Tile #<nn>`)
- `created_at timestamptz`
- Unique `(user_id, tile_number)`
- RLS: user can select/insert/delete only their own rows

## 2. Auth redirect

After login/signup confirmation, query `user_tiles` for the current user:
- 0 rows → `/zones` (Tile Manager)
- ≥1 row → `/dashboard`

Replaces the current "is new account" heuristic.

## 3. Tile Manager (`/zones`)

Rewrite the page:
- Input field: tile number (1–999) + Add button
- Grid of cards for each saved tile, showing: `Tile #03`, recent-event count, connected dot (green if event in last 60s), Delete button
- Empty state: "Add your first tile to start tracking" with a hint that the ESP32 should report under tag `tile_<n>`

## 4. Dynamic tiles in floor-data

- Replace hardcoded `SensorKey` union and `ZONE_ORDER` with a runtime list derived from the user's saved tiles.
- Event `sensor` becomes a free-form `string` (e.g. `tile_3`).
- `computeStats` takes the tile list as an arg; counts only events whose sensor matches a known `tile_<n>`.
- Add `lastEpochByTile` so the dashboard can mark each tile connected if `now - lastEpoch < 60_000`.

## 5. Dashboard rendering

- `Dashboard` and `IsoHeatmap` accept the user's tile list.
- The 2×2 grid in `IsoHeatmap` becomes a square-ish grid sized to `Math.ceil(sqrt(tiles.length))`.
- Each tile column shows the tile's label `Tile #<nn>`, its event count, and goes dim ("Awaiting") when not connected (no event in last 60s).
- Leader-line tags use the tile's number, not a fixed "Tile #01..04" sequence.
- If the user has 0 tiles on `/dashboard`, redirect them to `/zones`.

## 6. ESP32 mapping

No code change is required on the ESP32 side beyond what the user is already doing — it posts events with `sensor: "tile_<n>"` to `http://localhost:8080/data`. The dashboard now matches those tags to the tiles the user added in the Tile Manager.

## Out of scope

- Renaming/reordering tiles (only number + delete for now)
- Persisting events server-side in Lovable Cloud — we keep using the user's local `localhost:8080` server as the event source
- Heartbeat endpoint (we use the "recent event <60s" rule)
