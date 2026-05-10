import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchFootTraffic,
  footTrafficSupabase,
  rowToEvent,
  type FootTrafficRow,
} from "@/lib/foot-traffic";
import { computeStats, type FloorEvent } from "@/lib/floor-data";

export type ConnState = "live" | "demo" | "offline";

export function useFootTraffic() {
  const [rows, setRows] = useState<FootTrafficRow[]>([]);
  const [conn, setConn] = useState<ConnState>("offline");
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const rowsRef = useRef<FootTrafficRow[]>([]);

  const setAndStore = useCallback((next: FootTrafficRow[]) => {
    rowsRef.current = next;
    setRows(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchFootTraffic(500);
      setAndStore(data);
      setConn("live");
      setLastUpdate(Date.now());
    } catch (e) {
      console.error("[foot_traffic] fetch failed", e);
      setConn("offline");
    }
  }, [setAndStore]);

  useEffect(() => {
    refresh();
    const channel = footTrafficSupabase
      .channel("foot_traffic_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "foot_traffic" },
        (payload) => {
          const row = payload.new as FootTrafficRow;
          const next = [row, ...rowsRef.current].slice(0, 500);
          setAndStore(next);
          setConn("live");
          setLastUpdate(Date.now());
        },
      )
      .subscribe();
    return () => {
      footTrafficSupabase.removeChannel(channel);
    };
  }, [refresh, setAndStore]);

  const events: FloorEvent[] = rows.map(rowToEvent);
  const stats = computeStats(events);

  return { rows, events, stats, conn, lastUpdate, refresh };
}
