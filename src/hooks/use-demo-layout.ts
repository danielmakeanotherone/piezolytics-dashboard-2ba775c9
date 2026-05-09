import { useCallback, useEffect, useState } from "react";
import type { OutlineElement } from "@/components/OutlineBuilder";

const STORAGE_KEY = "piezolytics:demo-outline:v1";

const DEFAULT_LAYOUT: OutlineElement[] = [
  { id: "d1", type: "wall", x: 0, y: 0, w: 24, h: 1, name: "Wall N" },
  { id: "d2", type: "wall", x: 0, y: 15, w: 24, h: 1, name: "Wall S" },
  { id: "d3", type: "wall", x: 0, y: 1, w: 1, h: 14, name: "Wall W" },
  { id: "d4", type: "wall", x: 23, y: 1, w: 1, h: 14, name: "Wall E" },
  { id: "d5", type: "door", x: 11, y: 15, w: 2, h: 1, name: "Front Door" },
  { id: "d6", type: "shelving", x: 4, y: 3, w: 1, h: 4, name: "Shelf A" },
  { id: "d7", type: "shelving", x: 8, y: 3, w: 1, h: 4, name: "Shelf B" },
  { id: "d8", type: "checkout", x: 18, y: 11, w: 2, h: 2, name: "Checkout" },
  { id: "d9", type: "tile", x: 11, y: 13, w: 1, h: 1, name: "Front Entrance", tileNumber: 1 },
  { id: "d10", type: "tile", x: 6, y: 5, w: 1, h: 1, name: "Aisle A", tileNumber: 2 },
  { id: "d11", type: "tile", x: 18, y: 13, w: 1, h: 1, name: "Checkout", tileNumber: 3 },
  { id: "d12", type: "tile", x: 14, y: 5, w: 1, h: 1, name: "Aisle B", tileNumber: 4 },
];

const EVENT = "piezolytics:demo-outline:changed";

function readSaved(): OutlineElement[] {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? (parsed as OutlineElement[]) : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

/**
 * Shared in-page demo layout. Working edits are kept in memory and broadcast
 * to all consumers (so the Heat Map mirrors the Outline Builder live).
 * `save()` persists the current layout to localStorage permanently.
 */
export function useDemoLayout() {
  const [savedElements, setSavedElements] = useState<OutlineElement[]>(() => readSaved());
  const [workingElements, setWorkingElements] = useState<OutlineElement[]>(() => readSaved());

  // Listen for cross-component updates within the same tab.
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ working: OutlineElement[]; saved: OutlineElement[] }>).detail;
      if (!detail) return;
      setWorkingElements(detail.working);
      setSavedElements(detail.saved);
    };
    window.addEventListener(EVENT, onChange as EventListener);
    return () => window.removeEventListener(EVENT, onChange as EventListener);
  }, []);

  const broadcast = useCallback((working: OutlineElement[], saved: OutlineElement[]) => {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { working, saved } }));
  }, []);

  const setElements = useCallback((next: OutlineElement[]) => {
    setWorkingElements(next);
    broadcast(next, savedElements);
  }, [broadcast, savedElements]);

  const save = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workingElements));
    } catch {/* ignore */}
    setSavedElements(workingElements);
    broadcast(workingElements, workingElements);
  }, [workingElements, broadcast]);

  return { elements: workingElements, savedElements, setElements, save };
}
