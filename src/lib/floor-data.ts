// Tiles are user-defined. Each tile has a number (1..999) and is reported
// by the ESP32 with sensor tag `tile_<n>` (e.g. `tile_3`).

export interface FloorEvent {
  ts: string;
  epoch: number;
  sensor: string; // tile_<n>
  value: number;
}

export interface Tile {
  id: string;
  number: number;
  label?: string | null;
}

export const tileKey = (n: number) => `tile_${n}`;
export const tileLabel = (t: Tile) =>
  t.label && t.label.trim().length > 0
    ? t.label
    : `Tile #${String(t.number).padStart(2, "0")}`;

export const API_BASE = "http://localhost:8080";

export async function fetchEvents(signal?: AbortSignal): Promise<FloorEvent[]> {
  const r = await fetch(`${API_BASE}/data`, { signal, cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as FloorEvent[];
}

export async function clearEvents(): Promise<void> {
  await fetch(`${API_BASE}/clear`, { cache: "no-store" });
}

// ---- Demo generator ----
// Keyed by serialized tile-number list so switching tile sets reseeds.
let demoStore: FloorEvent[] = [];
let demoSeededKey: string | null = null;

function seedDemo(tiles: Tile[]) {
  const key = tiles.map((t) => t.number).sort((a, b) => a - b).join(",");
  if (demoSeededKey === key) return;
  demoSeededKey = key;
  demoStore = [];
  if (tiles.length === 0) return;

  const now = Date.now();
  const out: FloorEvent[] = [];
  const DAY = 86400000;
  const daysBack = 365 * 3;
  for (let d = 0; d < daysBack; d++) {
    const dayStart = now - d * DAY;
    const date = new Date(dayStart);
    const dow = date.getDay();
    const month = date.getMonth();
    const season = 1 + 0.35 * Math.sin(((month + 9) / 12) * Math.PI * 2);
    const weekend = dow === 0 || dow === 6 ? 1.45 : 1;
    const recency = d < 7 ? 1.6 : d < 30 ? 1.25 : d < 90 ? 1 : 0.7;
    const baseEvents = Math.floor((6 + Math.random() * 10) * season * weekend * recency);
    for (let i = 0; i < baseEvents; i++) {
      const r = Math.random();
      let hour: number;
      if (r < 0.4) hour = 11 + Math.floor(Math.random() * 3);
      else if (r < 0.75) hour = 17 + Math.floor(Math.random() * 3);
      else hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      const epoch = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, second).getTime();
      if (epoch > now) continue;
      const tile = tiles[Math.floor(Math.random() * tiles.length)];
      out.push({
        ts: new Date(epoch).toISOString(),
        epoch,
        sensor: tileKey(tile.number),
        value: 200 + Math.floor(Math.random() * 800),
      });
    }
  }
  demoStore = out.sort((a, b) => a.epoch - b.epoch);
}

export function tickDemo(tiles: Tile[]): FloorEvent[] {
  seedDemo(tiles);
  if (tiles.length === 0) return [];
  const adds = Math.floor(Math.random() * 4);
  const now = Date.now();
  for (let i = 0; i < adds; i++) {
    const tile = tiles[Math.floor(Math.random() * tiles.length)];
    demoStore.push({
      ts: new Date(now).toISOString(),
      epoch: now,
      sensor: tileKey(tile.number),
      value: 200 + Math.floor(Math.random() * 800),
    });
  }
  if (demoStore.length > 5000) demoStore = demoStore.slice(-5000);
  return [...demoStore];
}

export function clearDemo() {
  demoStore = [];
  demoSeededKey = null;
}

// ---- Derivations ----
export interface Stats {
  counts: Record<string, number>;
  lastEpoch: Record<string, number>;
  total: number;
  activeTiles: number;
  peakTile: number | null;
  maxCount: number;
}

const RECENT_MS = 60_000;

export function computeStats(events: FloorEvent[], tiles: Tile[]): Stats {
  const counts: Record<string, number> = {};
  const lastEpoch: Record<string, number> = {};
  for (const t of tiles) {
    counts[tileKey(t.number)] = 0;
    lastEpoch[tileKey(t.number)] = 0;
  }
  let total = 0;
  for (const e of events) {
    if (counts[e.sensor] === undefined) continue; // not one of our tiles
    counts[e.sensor]++;
    total++;
    if (e.epoch > lastEpoch[e.sensor]) lastEpoch[e.sensor] = e.epoch;
  }
  const now = Date.now();
  const activeTiles = tiles.filter((t) => now - lastEpoch[tileKey(t.number)] < RECENT_MS).length;
  let peakTile: number | null = null;
  let maxCount = 0;
  for (const t of tiles) {
    const c = counts[tileKey(t.number)];
    if (c > maxCount) {
      maxCount = c;
      peakTile = t.number;
    }
  }
  return { counts, lastEpoch, total, activeTiles, peakTile, maxCount };
}

export function isTileConnected(stats: Stats, tile: Tile): boolean {
  const last = stats.lastEpoch[tileKey(tile.number)] ?? 0;
  return Date.now() - last < RECENT_MS;
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
