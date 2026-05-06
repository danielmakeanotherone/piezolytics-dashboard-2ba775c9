import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearDemo,
  clearEvents,
  computeStats,
  fetchEvents,
  tickDemo,
  type FloorEvent,
} from "@/lib/floor-data";

export type ConnState = "live" | "demo" | "offline";

export function useFloorData(intervalMs = 2000) {
  const [events, setEvents] = useState<FloorEvent[]>([]);
  const [conn, setConn] = useState<ConnState>("offline");
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const usingDemoRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const data = await fetchEvents();
      usingDemoRef.current = false;
      setEvents(data);
      setConn("live");
      setLastUpdate(Date.now());
    } catch {
      usingDemoRef.current = true;
      const data = tickDemo();
      setEvents(data);
      setConn("demo");
      setLastUpdate(Date.now());
    }
  }, []);

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

  const stats = computeStats(events);

  return { events, stats, conn, lastUpdate, refresh, clearAll };
}
