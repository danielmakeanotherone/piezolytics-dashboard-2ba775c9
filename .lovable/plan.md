# Piezolytics — Floor Traffic Dashboard

A dark-themed, copper-accented real-time dashboard that visualizes foot traffic across 4 retail zones using piezo floor sensor data. The centerpiece is a hand-drawn isometric 3D heatmap where block height encodes visit count.

## Pages & Routes

- `/` — **Dashboard** (full visualization, the main view)
- `/zones` — Per-zone detail cards with mini-charts and recent events filtered per zone
- `/history` — Full paginated event log with filter by zone and time range

All three share the sticky nav bar.

## Layout (Dashboard)

```text
┌──────────────────────────────────────────────────────────────┐
│ ◆ Piezolytics   Dashboard  Zones  History    ● live · ↻ · ✕ │  58px nav
├──────────────────────────────────────────────────────────────┤
│ Floor Analytics                  ┌────┐ ┌────┐ ┌────┐        │
│ Live piezo · 3 of 4 active       │ 42 │ │  3 │ │ A1 │        │  hero
│                                  └────┘ └────┘ └────┘        │
├─────────────────────────────────────────┬────────────────────┤
│ Activity Heatmap                        │ Zone Rankings      │
│ elevation = visit count · 42 total      │ 3 active           │
│                                         │ ┌────────────────┐ │
│        [isometric 3D canvas]            │ │ Entrance  18   │ │
│                                         │ │ ▓▓▓▓▓▓▓▓▓░  43%│ │
│                                         │ └────────────────┘ │  530px
│                                         │ ... 3 more cards   │
│ ▁▂▃▅▇▆▄▃▂▁▂▄▆▇▅▃▁ sparkline (44px)      │                    │
├─────────────────────────────────────────┴────────────────────┤
│ Time         Zone          Signal                            │  table
│ 14:02:11     Entrance      [ 812 ]                           │  last 20
└──────────────────────────────────────────────────────────────┘
```

## Isometric Heatmap (canvas centerpiece)

Built exactly to spec on a `<canvas>` using Canvas 2D:
- 2×2 grid of floating 3D blocks (Entrance, Aisle A, Checkout, Aisle B)
- Block height scales from EMIN=14 to EMAX=min(H*0.30, 120) by `count/maxCount`
- TW = min(W*0.20, 92), TD = TW*0.50
- Top face: radial gradient (dark → copper) + glow overlay when norm > 0.25
- Left/right faces: vertical linear gradients, right face darker
- Copper top-edge strokes with intensity tied to norm
- Soft elliptical shadow under each block (drawn first, back-to-front)
- Ambient copper ground glow centered under the cluster
- Visit count number large and bright on top; zone name smaller in copper below it
- Redraws on resize via `requestAnimationFrame`; redraws on every poll

## Live Data Flow

- Poll `GET /data` every 2 seconds via `setInterval`
- Map `sensor` keys to zone labels (entrance/aisle_a/checkout/aisle_b)
- Compute: counts per zone, total events, active zones, peak zone, sparkline buckets (last ~60 min in 17 buckets), last 20 events
- Refresh button → immediate poll
- Clear button → `GET /clear` then refetch
- Live pill: pulsing copper dot + "live · HH:MM:SS" of last successful poll
- Connection failure: pill turns muted, shows "offline"

Since the backend (`localhost:8080`) won't be reachable from the deployed app, the dashboard also includes a **demo mode toggle** (auto-enabled when `/data` fails): generates plausible synthetic events every 2s so the visuals are always alive. Real backend takes over the moment it responds.

## Components

- `NavBar` — logo + tabs + live pill + actions
- `LogoMark` — inline SVG (3×3 dot grid in #c8a876)
- `HeroStats` — title block + 3 stat cards
- `IsoHeatmap` — canvas + resize observer + draw routine
- `Sparkline` — thin bar chart of event frequency (own small canvas)
- `ZoneRankings` — sorted zone cards with activity bar
- `ActivityTable` — last 20 events with copper signal badge
- `useFloorData` hook — polling, demo fallback, derived stats

## Design Tokens

All colors from the spec wired into `src/styles.css` as CSS variables and Tailwind theme tokens (`bg`, `surf`, `surf2`, `surf3`, `bord2`, `acc`, `acc2`, `acc3`, `text`, `text2`, `text3`, `text4`). Panels: `rounded-2xl`, the exact double box-shadow, and the 1px translucent white border. Lora + Inter loaded from Google Fonts; Lora used only for the brand wordmark and the hero title, Inter for everything else.

## Out of Scope

- Real Arduino integration (the spec defines the contract; the dashboard consumes it)
- Auth, accounts, or persistence beyond the backend's own `/data`
- Light theme

