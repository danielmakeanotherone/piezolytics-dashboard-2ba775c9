import { createFileRoute, Link } from "@tanstack/react-router";
import { type CSSProperties, useMemo, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { useFloorData } from "@/hooks/use-floor-data";
import { useUserTiles } from "@/hooks/use-user-tiles";
import { useRoomLayout } from "@/hooks/use-room-layout";
import { ZONE_ORDER } from "@/lib/floor-data";
import {
  OUTLINE_COLS,
  OUTLINE_ROWS,
  OUTLINE_DEFS,
  type OutlineElement,
} from "@/components/OutlineBuilder";

export const Route = createFileRoute("/heatmap")({
  head: () => ({
    meta: [
      { title: "Heat Map — Piezolytics" },
      { name: "description", content: "Visit intensity over your placed sensor tiles." },
    ],
  }),
  component: HeatMapPage,
});

type RangeKey = "Day" | "Week" | "Month" | "Quarter" | "Year" | "All";
const RANGES: RangeKey[] = ["Day", "Week", "Month", "Quarter", "Year", "All"];

function rangeStart(range: RangeKey): number {
  const now = Date.now();
  switch (range) {
    case "Day": return now - 86400000;
    case "Week": return now - 7 * 86400000;
    case "Month": return now - 30 * 86400000;
    case "Quarter": return now - 91 * 86400000;
    case "Year": return now - 365 * 86400000;
    case "All": return 0;
  }
}

// Heat scale: cool yellow → orange → red (hottest).
function heatRGB(t: number): [number, number, number] {
  const stops: { p: number; c: [number, number, number] }[] = [
    { p: 0.0, c: [255, 235, 130] }, // pale yellow
    { p: 0.5, c: [255, 150, 50] },  // orange
    { p: 1.0, c: [220, 30, 25] },   // red
  ];
  const tt = Math.max(0, Math.min(1, t));
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (tt >= stops[i].p && tt <= stops[i + 1].p) { a = stops[i]; b = stops[i + 1]; break; }
  }
  const k = (tt - a.p) / Math.max(0.0001, (b.p - a.p));
  return [
    Math.round(a.c[0] + (b.c[0] - a.c[0]) * k),
    Math.round(a.c[1] + (b.c[1] - a.c[1]) * k),
    Math.round(a.c[2] + (b.c[2] - a.c[2]) * k),
  ];
}
const heatColor = (t: number) => { const [r, g, b] = heatRGB(t); return `rgb(${r}, ${g}, ${b})`; };

function HeatMapPage() {
  const { events, conn, lastUpdate, refresh, clearAll } = useFloorData();
  const { loading: tilesLoading } = useUserTiles();
  const { elements, loading: layoutLoading } = useRoomLayout();
  const [range, setRange] = useState<RangeKey>("Week");

  const counts = useMemo(() => {
    const start = rangeStart(range);
    const map = new Map<number, number>();
    for (const e of events) {
      if (e.epoch < start) continue;
      const idx = ZONE_ORDER.indexOf(e.sensor);
      const tn = idx >= 0 ? idx + 1 : -1;
      if (tn < 0) continue;
      map.set(tn, (map.get(tn) ?? 0) + 1);
    }
    return map;
  }, [events, range]);

  const tileEls = elements.filter((e) => e.type === "tile" && e.tileNumber != null);
  const maxCount = Math.max(1, ...tileEls.map((e) => counts.get(e.tileNumber!) ?? 0));

  const renderEl = (el: OutlineElement) => {
    const def = OUTLINE_DEFS.find((d) => d.type === el.type)!;
    const Icon = def.icon;
    const minDim = Math.min(el.w, el.h);
    const iconSize = Math.max(10, Math.min(16, minDim * 8 + 4));
    const fontSize = Math.max(7, Math.min(10, minDim * 4 + 6));
    const isTile = el.type === "tile" && el.tileNumber != null;

    let bg: string;
    let border: string;
    let iconColor = "var(--acc)";
    let textColor: string = "var(--text)";

    if (isTile) {
      const c = counts.get(el.tileNumber!) ?? 0;
      const t = c / maxCount;
      if (c <= 0) {
        // Cold / no visits — faint surface
        bg = "color-mix(in srgb, var(--text3) 12%, var(--surf2))";
        border = "1.5px solid color-mix(in srgb, var(--bord2) 80%, transparent)";
        iconColor = "var(--text3)";
        textColor = "var(--text2)";
      } else {
        const [r, g, b] = heatRGB(t);
        bg = `rgb(${r}, ${g}, ${b})`;
        border = `1.5px solid rgba(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)}, 1)`;
        // Darken text for legibility on warm fills
        iconColor = "rgba(0,0,0,0.85)";
        textColor = "rgba(0,0,0,0.9)";
      }
    } else {
      // Non-tile elements: use the same look as the Outline Builder.
      bg = `color-mix(in srgb, var(--acc) ${def.tint * 100}%, var(--surf2))`;
      border = `1.5px solid color-mix(in srgb, var(--acc) ${Math.min(90, def.tint * 100 + 30)}%, var(--bord2))`;
    }

    const labelText = isTile ? `#${el.tileNumber}` : el.name;
    const visitText = isTile ? (counts.get(el.tileNumber!) ?? 0) : null;

    return (
      <div
        key={el.id}
        className="absolute flex items-center justify-center"
        style={{
          left: `${(el.x / OUTLINE_COLS) * 100}%`,
          top: `${(el.y / OUTLINE_ROWS) * 100}%`,
          width: `${(el.w / OUTLINE_COLS) * 100}%`,
          height: `${(el.h / OUTLINE_ROWS) * 100}%`,
          background: bg,
          border,
          borderRadius: 4,
          zIndex: 1,
        }}
        title={isTile ? `Tile #${el.tileNumber}: ${visitText} visits` : el.name}
      >
        <div className="flex flex-col items-center justify-center gap-0.5 pointer-events-none px-0.5 w-full overflow-hidden">
          <Icon size={iconSize} style={{ color: iconColor, opacity: 0.95 }} />
          <span
            className="font-medium truncate max-w-full leading-none"
            style={{ fontSize, color: textColor }}
          >
            {labelText}
          </span>
          {isTile && visitText! > 0 && (
            <span
              className="font-mono leading-none"
              style={{ fontSize: Math.max(6, fontSize - 2), color: textColor, opacity: 0.85 }}
            >
              {visitText}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <NavBar conn={conn} lastUpdate={lastUpdate} onRefresh={refresh} onClear={clearAll} />
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-text" style={{ fontSize: 28, fontWeight: 600 }}>
              Heat Map
            </h1>
            <p className="text-text3 text-sm mt-1">
              Same layout you built — sensor tiles colored by visit intensity. Red is hottest.
            </p>
          </div>
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{ background: "var(--surf2)", border: "1px solid var(--bord2)" }}
          >
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                style={{
                  background: r === range ? "var(--surf3)" : "transparent",
                  color: r === range ? "var(--acc)" : "var(--text2)",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {layoutLoading || tilesLoading ? (
          <div className="text-text3 text-sm">Loading…</div>
        ) : elements.length === 0 ? (
          <div className="panel p-10 text-center">
            <div className="text-text2 text-base mb-1">No layout yet</div>
            <div className="text-text3 text-sm mb-4">
              Build your room in Outline Builder and place tiles to see them light up here.
            </div>
            <Link
              to="/outline"
              className="inline-block px-4 py-2 rounded-md text-sm"
              style={{ background: "var(--acc)", color: "var(--bg)" }}
            >
              Open Outline Builder
            </Link>
          </div>
        ) : (
          <div className="panel p-4">
            <div
              className="relative rounded-lg overflow-hidden"
              style={{
                aspectRatio: `${OUTLINE_COLS}/${OUTLINE_ROWS}`,
                background: "var(--surf)",
                border: "1px solid var(--bord2)",
              }}
            >
              {/* Faint grid — matches the Outline Builder */}
              <div
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${OUTLINE_COLS}, 1fr)`,
                  gridTemplateRows: `repeat(${OUTLINE_ROWS}, 1fr)`,
                  zIndex: 0,
                }}
              >
                {Array.from({ length: OUTLINE_ROWS * OUTLINE_COLS }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      borderRight: "1px solid color-mix(in srgb, var(--bord2) 40%, transparent)",
                      borderBottom: "1px solid color-mix(in srgb, var(--bord2) 40%, transparent)",
                    }}
                  />
                ))}
              </div>
              {elements.map(renderEl)}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-4">
              <span className="text-text3 text-xs">Less</span>
              <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                {Array.from({ length: 40 }).map((_, i) => (
                  <span key={i} style={{ flex: 1, background: heatColor(i / 39) } as CSSProperties} />
                ))}
              </div>
              <span className="text-text3 text-xs">More visits</span>
              <span className="text-text3 text-xs font-mono ml-2">peak {maxCount}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
