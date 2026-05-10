import { createFileRoute, Link } from "@tanstack/react-router";
import { type CSSProperties, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { useFloorData } from "@/hooks/use-floor-data";
import { useUserTiles } from "@/hooks/use-user-tiles";
import { useRoomLayout } from "@/hooks/use-room-layout";
import { ZONE_ORDER } from "@/lib/floor-data";
import {
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

const RANGE_MS: Record<Exclude<RangeKey, "All">, number> = {
  Day: 86400000,
  Week: 7 * 86400000,
  Month: 30 * 86400000,
  Quarter: 91 * 86400000,
  Year: 365 * 86400000,
};

function rangeWindow(range: RangeKey, anchor: number): { start: number; end: number } {
  if (range === "All") return { start: 0, end: Date.now() };
  const span = RANGE_MS[range];
  return { start: anchor - span, end: anchor };
}

function formatWindow(range: RangeKey, anchor: number): string {
  if (range === "All") return "All time";
  const { start, end } = rangeWindow(range, anchor);
  const fmt = (t: number) =>
    new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (range === "Day") return fmt(end);
  return `${fmt(start)} – ${fmt(end)}`;
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
  const { elements, cols: OUTLINE_COLS, rows: OUTLINE_ROWS, loading: layoutLoading } = useRoomLayout();
  const [range, setRange] = useState<RangeKey>("Week");
  const [anchor, setAnchor] = useState<number>(() => Date.now());

  // Reset anchor to now whenever range changes (and clamp All to now).
  const effectiveAnchor = range === "All" ? Date.now() : anchor;
  const { start, end } = rangeWindow(range, effectiveAnchor);

  const counts = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of events) {
      if (e.epoch < start || e.epoch > end) continue;
      const idx = ZONE_ORDER.indexOf(e.sensor);
      const tn = idx >= 0 ? idx + 1 : -1;
      if (tn < 0) continue;
      map.set(tn, (map.get(tn) ?? 0) + 1);
    }
    return map;
  }, [events, start, end]);

  // Bounds for navigation — based on actual event timestamps.
  const dataBounds = useMemo(() => {
    if (events.length === 0) return { min: 0, max: Date.now() };
    let min = Infinity, max = -Infinity;
    for (const e of events) { if (e.epoch < min) min = e.epoch; if (e.epoch > max) max = e.epoch; }
    return { min, max };
  }, [events]);

  const span = range === "All" ? 0 : RANGE_MS[range];
  const canPrev = range !== "All" && start - span >= dataBounds.min - span;
  const canNext = range !== "All" && end < Date.now();
  const shift = (dir: -1 | 1) => {
    if (range === "All") return;
    setAnchor((a) => Math.min(Date.now(), a + dir * span));
  };

  const tileEls = elements.filter((e) => e.type === "tile" && e.tileNumber != null);
  const maxCount = Math.max(1, ...tileEls.map((e) => counts.get(e.tileNumber!) ?? 0));

  const renderEl = (el: OutlineElement) => {
    const def = OUTLINE_DEFS.find((d) => d.type === el.type)!;
    const Icon = def.icon;
    const minDim = Math.min(el.w, el.h);
    const iconSize = Math.max(10, Math.min(16, minDim * 8 + 4));
    const fontSize = Math.max(7, Math.min(10, minDim * 4 + 6));
    const isTile = el.type === "tile" && el.tileNumber != null;

    // All elements use the same neutral outline-builder look — heat is overlaid separately.
    const bg = `color-mix(in srgb, var(--acc) ${def.tint * 100}%, var(--surf2))`;
    const border = `1.5px solid color-mix(in srgb, var(--acc) ${Math.min(90, def.tint * 100 + 30)}%, var(--bord2))`;

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
          zIndex: 2,
        }}
        title={isTile ? `Tile #${el.tileNumber}: ${visitText} visits` : el.name}
      >
        <div className="flex flex-col items-center justify-center gap-0.5 pointer-events-none px-0.5 w-full overflow-hidden">
          <Icon size={iconSize} style={{ color: "var(--acc)", opacity: 0.95 }} />
          <span
            className="font-medium truncate max-w-full leading-none"
            style={{ fontSize, color: "var(--text)" }}
          >
            {labelText}
          </span>
          {isTile && visitText! > 0 && (
            <span
              className="font-mono leading-none"
              style={{ fontSize: Math.max(6, fontSize - 2), color: "var(--text2)", opacity: 0.85 }}
            >
              {visitText}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Soft radial bloom centered on each tile — green outer halo → red center.
  const renderHeatBlob = (el: OutlineElement) => {
    if (el.type !== "tile" || el.tileNumber == null) return null;
    const c = counts.get(el.tileNumber) ?? 0;
    if (c <= 0) return null;
    const t = c / maxCount;
    // Bloom radius (in cells): scales with intensity. Base 4 cells → up to 9.
    const radiusCells = 1.8 + t * 1.6;
    const wPct = ((radiusCells * 2) / OUTLINE_COLS) * 100;
    const hPct = ((radiusCells * 2) / OUTLINE_ROWS) * 100;
    const cxPct = ((el.x + el.w / 2) / OUTLINE_COLS) * 100;
    const cyPct = ((el.y + el.h / 2) / OUTLINE_ROWS) * 100;
    const coreA = 0.7 + t * 0.2;
    return (
      <div
        key={`blob_${el.id}`}
        className="absolute pointer-events-none"
        style={{
          left: `calc(${cxPct}% - ${wPct / 2}%)`,
          top: `calc(${cyPct}% - ${hPct / 2}%)`,
          width: `${wPct}%`,
          height: `${hPct}%`,
          background: `radial-gradient(circle,
            rgba(220, 30, 25, ${coreA}) 0%,
            rgba(255, 90, 30, ${0.55 + t * 0.2}) 14%,
            rgba(255, 170, 40, ${0.45}) 28%,
            rgba(255, 230, 80, 0.35) 44%,
            rgba(120, 220, 120, 0.28) 60%,
            rgba(120, 220, 120, 0) 78%)`,
          filter: "blur(10px)",
          mixBlendMode: "screen",
          zIndex: 3,
        }}
      />
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

        {/* Date navigator */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shift(-1)}
              disabled={!canPrev}
              className="p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "var(--surf2)", border: "1px solid var(--bord2)", color: "var(--text2)" }}
              aria-label="Previous period"
            >
              <ChevronLeft size={16} />
            </button>
            <div
              className="px-3 py-1.5 rounded-md text-xs font-mono"
              style={{ background: "var(--surf2)", border: "1px solid var(--bord2)", color: "var(--text)", minWidth: 220, textAlign: "center" }}
            >
              {formatWindow(range, effectiveAnchor)}
            </div>
            <button
              onClick={() => shift(1)}
              disabled={!canNext}
              className="p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "var(--surf2)", border: "1px solid var(--bord2)", color: "var(--text2)" }}
              aria-label="Next period"
            >
              <ChevronRight size={16} />
            </button>
            {range !== "All" && anchor < Date.now() - 1000 && (
              <button
                onClick={() => setAnchor(Date.now())}
                className="px-2 py-1.5 rounded-md text-xs"
                style={{ background: "var(--surf2)", border: "1px solid var(--bord2)", color: "var(--text2)" }}
              >
                Now
              </button>
            )}
          </div>
          {range !== "All" && (
            <input
              type="date"
              value={new Date(effectiveAnchor).toISOString().slice(0, 10)}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) {
                  // Anchor at end-of-day so the window covers the picked date.
                  d.setHours(23, 59, 59, 999);
                  setAnchor(Math.min(Date.now(), d.getTime()));
                }
              }}
              className="px-2 py-1.5 rounded-md text-xs"
              style={{ background: "var(--surf2)", border: "1px solid var(--bord2)", color: "var(--text)" }}
            />
          )}
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
              {elements.map(renderHeatBlob)}
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
