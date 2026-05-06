export type SensorKey = "entrance" | "aisle_a" | "checkout" | "aisle_b";

export interface FloorEvent {
  ts: string;
  epoch: number;
  sensor: SensorKey;
  value: number;
}

export const ZONE_ORDER: SensorKey[] = ["entrance", "aisle_a", "checkout", "aisle_b"];

export const ZONE_LABELS: Record<SensorKey, string> = {
  entrance: "Entrance",
  aisle_a: "Aisle A",
  checkout: "Checkout",
  aisle_b: "Aisle B",
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
  // ~80 events spread over the last 50 minutes
  for (let i = 0; i < 80; i++) {
    const epoch = now - Math.floor(Math.random() * 50 * 60 * 1000);
    const sensor = pickWeighted();
    out.push({
      ts: new Date(epoch).toISOString(),
      epoch,
      sensor,
      value: 200 + Math.floor(Math.random() * 800),
    });
  }
  demoStore = out.sort((a, b) => a.epoch - b.epoch);
}

export function tickDemo(): FloorEvent[] {
  seedDemo();
  // Add 0–3 new events each tick
  const adds = Math.floor(Math.random() * 4);
  const now = Date.now();
  for (let i = 0; i < adds; i++) {
    const sensor = pickWeighted();
    demoStore.push({
      ts: new Date(now).toISOString(),
      epoch: now,
      sensor,
      value: 200 + Math.floor(Math.random() * 800),
    });
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
  const d = new Date(epoch);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}
