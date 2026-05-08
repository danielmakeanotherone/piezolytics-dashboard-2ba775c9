import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearDemo,
  clearEvents,
  computeStats,
  fetchEvents,
  tickDemo,
  type FloorEvent,
  type Tile,
} from "@/lib/floor-data";

export type ConnState = "live" | "demo" | "offline";

export function useFloorData(
  tiles: Tile[],
  intervalMs = 2000,
  options: { demo?: boolean } = {},
) {
  const { demo = false } = options;
  const [events, setEvents] = useState<FloorEvent[]>([]);
  const [conn, setConn] = useState<ConnState>("offline");
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const usingDemoRef = useRef(false);
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;

  const poll = useCallback(async () => {
    try {
      const data = await fetchEvents();
      usingDemoRef.current = false;
      setEvents(data);
      setConn("live");
      setLastUpdate(Date.now());
    } catch {
      if (demo) {
        usingDemoRef.current = true;
        const data = tickDemo(tilesRef.current);
        setEvents(data);
        setConn("demo");
        setLastUpdate(Date.now());
      } else {
        usingDemoRef.current = false;
        setConn("offline");
      }
    }
  }, [demo]);

  useEffect(() => {
    poll();
    const id = window.setInterval(poll, intervalMs);
    return () => window.clearInterval(id);
  }, [poll, intervalMs]);

  const refresh = useCallback(() => poll(), [poll]);

  const clearAll = useCallback(async () => {
    if (usingDemoRef.current) {
      clearDemo();
      setEvents([]);
      setLastUpdate(Date.now());
    } else {
      try {
        await clearEvents();
      } catch {
        /* ignore */
      }
      await poll();
    }
  }, [poll]);

  const stats = computeStats(events, tiles);

  return { events, stats, conn, lastUpdate, refresh, clearAll };
}
