import { createClient } from "@supabase/supabase-js";
import type { FloorEvent, SensorKey } from "@/lib/floor-data";

// External Supabase project that hosts the live `foot_traffic` table.
const SUPABASE_URL = "https://ltkznfuevkjnomrbzegb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0a3puZnVldmtqbm9tcmJ6ZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTcxODIsImV4cCI6MjA5MTA5MzE4Mn0.ZvrJgDZyw8B38nxqr3NODOAdZWjVuuQB1koRs3IuMcw";

export const footTrafficSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface FootTrafficRow {
  id?: number | string;
  tile_id: number | string | null;
  tile_a_peak: number | null;
  tile_a_dwell_ms: number | null;
  tile_b_peak?: number | null;
  tile_b_dwell_ms?: number | null;
  first_tile?: number | null;
  created_at: string;
}

const TILE_TO_SENSOR: Record<string, SensorKey> = {
  "1": "entrance",
  "2": "aisle_a",
  "3": "checkout",
  "4": "aisle_b",
};

export function rowToEvent(row: FootTrafficRow): FloorEvent {
  const epoch = new Date(row.created_at).getTime();
  const key = String(row.tile_id ?? "1");
  const sensor: SensorKey = TILE_TO_SENSOR[key] ?? "entrance";
  const peakA = row.tile_a_peak ?? 0;
  const peakB = row.tile_b_peak ?? 0;
  const ft = row.first_tile === 2 ? 2 : 1;
  return {
    ts: row.created_at,
    epoch,
    sensor,
    value: Math.max(peakA, peakB) || peakA || peakB || 0,
    firstTile: ft as 1 | 2,
    dwellAMs: row.tile_a_dwell_ms ?? undefined,
    dwellBMs: row.tile_b_dwell_ms ?? undefined,
    peakA,
    peakB,
  };
}

export async function fetchFootTraffic(limit = 500): Promise<FootTrafficRow[]> {
  const { data, error } = await footTrafficSupabase
    .from("foot_traffic")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FootTrafficRow[];
}
