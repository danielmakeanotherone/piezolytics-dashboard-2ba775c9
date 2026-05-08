export type SensorKey = "entrance" | "aisle_a" | "checkout" | "aisle_b";

export interface FloorEvent {
  ts: string;
  epoch: number;
  sensor: SensorKey;
  value: number;
  // Per-tile A/B side data from ESP32 VISIT payloads.
  // firstTile: 1 = stepped on A first (A → B), 2 = stepped on B first (B → A)
  firstTile?: 1 | 2;
  dwellAMs?: number;
  dwellBMs?: number;
  peakA?: number;
  peakB?: number;
}

export const ZONE_ORDER: SensorKey[] = ["entrance", "aisle_a", "checkout", "aisle_b"];

export const ZONE_LABELS: Record<SensorKey, string> = {
  entrance: "tile_1",
  aisle_a: "tile_2",
  checkout: "tile_3",
  aisle_b: "tile_4",
};

// Grid positions (col, row) in 2x2
export const ZONE_GRID: Record<SensorKey, { col: 0 | 1; row: 0 | 1 }> = {
  entrance: { col: 0, row: 0 },
  aisle_a: { col: 1, row: 0 },
  checkout: { col: 0, row: 1 },
  aisle_b: { col: 1, row: 1 },
};

export const API_BASE = "http://localhost:8080";

export async function fetchEvents(signal?: AbortSignal): Promise<FloorEvent[]> {
  const r = await fetch(`${API_BASE}/data`, { signal, cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as FloorEvent[];
}

export async function clearEvents(): Promise<void> {
  await fetch(`${API_BASE}/clear`, { cache: "no-store" });
}

// ---- Demo generator (used when backend unreachable) ----
let demoStore: FloorEvent[] = [];
let demoSeeded = false;

function pickWeighted(): SensorKey {
  // Entrance heaviest, then aisle_a, checkout, aisle_b
  const r = Math.random();
  if (r < 0.4) return "entrance";
  if (r < 0.7) return "aisle_a";
  if (r < 0.88) return "checkout";
  return "aisle_b";
}

function seedDemo() {
  if (demoSeeded) return;
  demoSeeded = true;
  const now = Date.now();
  const out: FloorEvent[] = [];
  const DAY = 86400000;
  // Spread synthetic events across the last ~3 years so Day/Week/Month/Quarter/Year/All
  // tabs all look lived-in. Each day has its own activity profile (weekday vs weekend,
  // month-of-year seasonality, hour-of-day rush peaks).
  const daysBack = 365 * 3;
  for (let d = 0; d < daysBack; d++) {
    const dayStart = now - d * DAY;
    const date = new Date(dayStart);
    const dow = date.getDay(); // 0 Sun .. 6 Sat
    const month = date.getMonth();
    // Seasonal multiplier — busier in Nov/Dec, quieter in Jan/Feb
    const season = 1 + 0.35 * Math.sin(((month + 9) / 12) * Math.PI * 2);
    // Weekend boost
    const weekend = dow === 0 || dow === 6 ? 1.45 : 1;
    // Decay older days slightly so recent windows feel denser
    const recency = d < 7 ? 1.6 : d < 30 ? 1.25 : d < 90 ? 1 : 0.7;
    const baseEvents = Math.floor((6 + Math.random() * 10) * season * weekend * recency);
    for (let i = 0; i < baseEvents; i++) {
      // Hour distribution: peaks ~12pm and ~6pm
      const r = Math.random();
      let hour: number;
      if (r < 0.4) hour = 11 + Math.floor(Math.random() * 3);
      else if (r < 0.75) hour = 17 + Math.floor(Math.random() * 3);
      else hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      const epoch = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, second).getTime();
      if (epoch > now) continue;
      out.push(makeDemoEvent(epoch, pickWeighted()));
    }
  }
  demoStore = out.sort((a, b) => a.epoch - b.epoch);
}

function makeDemoEvent(epoch: number, sensor: SensorKey): FloorEvent {
  const firstTile: 1 | 2 = Math.random() < 0.5 ? 1 : 2;
  const dwellA = 250 + Math.floor(Math.random() * 1500);
  const dwellB = 250 + Math.floor(Math.random() * 1500);
  const peakA = 240 + Math.floor(Math.random() * 760);
  const peakB = 240 + Math.floor(Math.random() * 760);
  return {
    ts: new Date(epoch).toISOString(),
    epoch,
    sensor,
    value: Math.max(peakA, peakB),
    firstTile,
    dwellAMs: dwellA,
    dwellBMs: dwellB,
    peakA,
    peakB,
  };
}

export function tickDemo(): FloorEvent[] {
  seedDemo();
  // Add 0–3 new events each tick
  const adds = Math.floor(Math.random() * 4);
  const now = Date.now();
  for (let i = 0; i < adds; i++) {
    const sensor = pickWeighted();
    demoStore.push(makeDemoEvent(now, sensor));
  }
  // Cap memory
  if (demoStore.length > 500) demoStore = demoStore.slice(-500);
  return [...demoStore];
}

export function clearDemo() {
  demoStore = [];
}

// ---- Derivations ----
export interface Stats {
  counts: Record<SensorKey, number>;
  total: number;
  activeZones: number;
  peakZone: SensorKey | null;
  maxCount: number;
}

export function computeStats(events: FloorEvent[]): Stats {
  const counts: Record<SensorKey, number> = {
    entrance: 0,
    aisle_a: 0,
    checkout: 0,
    aisle_b: 0,
  };
  for (const e of events) {
    if (counts[e.sensor] !== undefined) counts[e.sensor]++;
  }
  const total = events.length;
  const activeZones = ZONE_ORDER.filter((z) => counts[z] > 0).length;
  let peakZone: SensorKey | null = null;
  let maxCount = 0;
  for (const z of ZONE_ORDER) {
    if (counts[z] > maxCount) {
      maxCount = counts[z];
      peakZone = z;
    }
  }
  return { counts, total, activeZones, peakZone, maxCount };
}

export function bucketSparkline(events: FloorEvent[], buckets = 24, windowMs = 60 * 60 * 1000): number[] {
  const now = Date.now();
  const start = now - windowMs;
  const out = new Array(buckets).fill(0);
  const bucketSize = windowMs / buckets;
  for (const e of events) {
    if (e.epoch < start) continue;
    const idx = Math.min(buckets - 1, Math.floor((e.epoch - start) / bucketSize));
    out[idx]++;
  }
  return out;
}

export function formatTime(epoch: number): string {
  return new Date(epoch).toISOString().slice(11, 19);
}
