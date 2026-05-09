import { type CSSProperties, useMemo, useState } from "react";
import { useFloorData } from "@/hooks/use-floor-data";
import { ZONE_ORDER, formatTime } from "@/lib/floor-data";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  OutlineBuilder,
  OUTLINE_COLS,
  OUTLINE_ROWS,
  OUTLINE_DEFS,
  type OutlineElement as _OutlineElement,
} from "@/components/OutlineBuilder";
import { useDemoLayout } from "@/hooks/use-demo-layout";

const DEMO_TILES = [
  { id: "1", tile_number: 1, label: "Front Entrance" },
  { id: "2", tile_number: 2, label: "Aisle A" },
  { id: "3", tile_number: 3, label: "Checkout" },
  { id: "4", tile_number: 4, label: "Aisle B" },
];

export function DemoTileManager() {
  return (
    <section className="max-w-[1400px] mx-auto px-6 pt-4 pb-2">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-display text-text" style={{ fontSize: 22, fontWeight: 600 }}>
            Tile Manager <span className="text-text3 text-xs uppercase tracking-wider ml-2">Preview</span>
          </h2>
          <p className="text-text3 text-sm mt-1">
            Register tile IDs hardcoded into your ESP32 devices and label each location.
          </p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium opacity-70 cursor-not-allowed"
          style={{ background: "var(--acc)", color: "#1a1611" }}
        >
          <Plus size={16} /> Add Tile
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEMO_TILES.map((t) => (
          <div key={t.id} className="panel p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-display text-text truncate" style={{ fontSize: 22, fontWeight: 600 }}>
                {t.label}
              </div>
              <div className="font-mono text-text3 text-[12px] mt-1">tile_{t.tile_number}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                disabled
                aria-label="Edit (preview)"
                className="p-2 rounded-lg text-text3 opacity-70 cursor-not-allowed"
                style={{ border: "1px solid var(--bord2)" }}
              >
                <Pencil size={15} />
              </button>
              <button
                disabled
                aria-label="Remove (preview)"
                className="p-2 rounded-lg text-text3 opacity-70 cursor-not-allowed"
                style={{ border: "1px solid var(--bord2)" }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DemoHistory() {
  const { events } = useFloorData(2000, { demo: true });
  const [filter, setFilter] = useState<number | "all">("all");

  const tagged = useMemo(
    () =>
      events.map((e) => {
        const idx = ZONE_ORDER.indexOf(e.sensor);
        return { ...e, tileNumber: idx >= 0 ? idx + 1 : -1 };
      }),
    [events],
  );

  const labelByNum = new Map(DEMO_TILES.map((t) => [t.tile_number, t.label]));
  const perTileCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of tagged) counts.set(e.tileNumber, (counts.get(e.tileNumber) ?? 0) + 1);
    return counts;
  }, [tagged]);

  const enriched = useMemo(() => {
    return tagged.map((e) => {
      const dir: "A→B" | "B→A" | null =
        e.firstTile === 1 ? "A→B" : e.firstTile === 2 ? "B→A" : null;
      const dwellMs = (e.dwellAMs ?? 0) + (e.dwellBMs ?? 0) || null;
      return { ...e, direction: dir, dwellMs };
    });
  }, [tagged]);

  const rows = enriched
    .filter((e) => filter === "all" || e.tileNumber === filter)
    .sort((a, b) => b.epoch - a.epoch)
    .slice(0, 80);

  return (
    <section className="max-w-[1400px] mx-auto px-6 pt-2 pb-12">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-text" style={{ fontSize: 22, fontWeight: 600 }}>
            Entries <span className="text-text3 text-xs uppercase tracking-wider ml-2">Preview</span>
          </h2>
          <p className="text-text3 text-sm mt-1">
            Per-tile entry history sourced from the simulated stream.
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <FBtn active={filter === "all"} onClick={() => setFilter("all")}>All</FBtn>
          {DEMO_TILES.map((t) => (
            <FBtn key={t.id} active={filter === t.tile_number} onClick={() => setFilter(t.tile_number)}>
              {t.label}
              <span className="ml-1.5 text-text3 font-mono text-[11px]">tile_{t.tile_number}</span>
            </FBtn>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {DEMO_TILES.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.tile_number)}
            className="panel p-4 text-left transition-colors"
            style={{ borderColor: filter === t.tile_number ? "var(--acc)" : undefined }}
          >
            <div className="font-display text-text truncate" style={{ fontSize: 16, fontWeight: 600 }}>
              {t.label}
            </div>
            <div className="font-mono text-text3 text-[11px] mt-0.5">tile_{t.tile_number}</div>
            <div className="mt-2">
              <span className="font-mono text-text" style={{ fontSize: 18, fontWeight: 600 }}>
                {perTileCounts.get(t.tile_number) ?? 0}
              </span>{" "}
              <span className="text-text3 text-[11px] uppercase tracking-wider">events</span>
            </div>
          </button>
        ))}
      </div>

      <div className="panel p-6">
        <div
          className="grid text-text3 text-[11px] uppercase tracking-wider px-3 py-2"
          style={{ gridTemplateColumns: "180px 1.4fr 110px 120px", borderBottom: "1px solid var(--bord2)" }}
        >
          <div>Time</div>
          <div>Tile · Direction</div>
          <div>Dwell</div>
          <div className="text-right">Signal</div>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {rows.length === 0 && (
            <div className="text-text3 text-sm py-12 text-center">No events yet.</div>
          )}
          {rows.map((e, i) => {
            const tileLabel = labelByNum.get(e.tileNumber) ?? `Tile ${e.tileNumber}`;
            return (
              <div
                key={`${e.epoch}-${i}`}
                className="grid items-center px-3 py-2 text-sm"
                style={{ gridTemplateColumns: "180px 1.4fr 110px 120px", borderBottom: "1px solid rgba(74,60,42,.4)" }}
              >
                <div className="text-text2 font-mono text-[12px]">{formatTime(e.epoch)}</div>
                <div className="text-text truncate">
                  <span className="text-text2">{tileLabel}</span>
                  {e.direction && (
                    <span
                      className="ml-2 inline-block px-2 py-0.5 rounded font-mono text-[11px]"
                      style={{
                        background: "rgba(200,168,118,0.10)",
                        color: "var(--acc)",
                        border: "1px solid rgba(200,168,118,0.20)",
                      }}
                    >
                      {e.direction === "A→B" ? "A → B" : "B → A"}
                    </span>
                  )}
                </div>
                <div className="text-text2 font-mono text-[12px]">
                  {e.dwellMs != null ? fmtDur(e.dwellMs) : "—"}
                </div>
                <div className="text-right">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-md font-mono text-[12px]"
                    style={{
                      background: "rgba(200,168,118,0.12)",
                      color: "var(--acc)",
                      border: "1px solid rgba(200,168,118,0.22)",
                    }}
                  >
                    {e.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function fmtDur(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function FBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs transition-colors"
      style={{
        background: active ? "var(--surf3)" : "var(--surf2)",
        color: active ? "var(--acc)" : "var(--text2)",
        border: "1px solid var(--bord2)",
      }}
    >
      {children}
    </button>
  );
}

// Heat color scale: pale yellow → orange → red.
function heatRGB(t: number): [number, number, number] {
  const stops: { p: number; c: [number, number, number] }[] = [
    { p: 0.0, c: [255, 235, 130] },
    { p: 0.5, c: [255, 150, 50] },
    { p: 1.0, c: [220, 30, 25] },
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

function renderOutlineBox(
  el: _OutlineElement,
  opts: { heat?: { count: number; max: number } } = {},
) {
  const def = OUTLINE_DEFS.find((d) => d.type === el.type)!;
  const Icon = def.icon;
  const minDim = Math.min(el.w, el.h);
  const iconSize = Math.max(10, Math.min(16, minDim * 8 + 4));
  const fontSize = Math.max(7, Math.min(10, minDim * 4 + 6));
  const isTile = el.type === "tile" && el.tileNumber != null;

  let bg: string;
  let border: string;
  let iconColor = "var(--acc)";
  let textColor = "var(--text)";

  if (isTile && opts.heat) {
    const { count, max } = opts.heat;
    if (count <= 0) {
      bg = "color-mix(in srgb, var(--text3) 12%, var(--surf2))";
      border = "1.5px solid color-mix(in srgb, var(--bord2) 80%, transparent)";
      iconColor = "var(--text3)";
      textColor = "var(--text2)";
    } else {
      const [r, g, b] = heatRGB(count / max);
      bg = `rgb(${r}, ${g}, ${b})`;
      border = `1.5px solid rgba(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)}, 1)`;
      iconColor = "rgba(0,0,0,0.85)";
      textColor = "rgba(0,0,0,0.9)";
    }
  } else {
    bg = `color-mix(in srgb, var(--acc) ${def.tint * 100}%, var(--surf2))`;
    border = `1.5px solid color-mix(in srgb, var(--acc) ${Math.min(90, def.tint * 100 + 30)}%, var(--bord2))`;
  }

  const labelText = isTile ? `#${el.tileNumber}` : el.name;
  const visit = isTile && opts.heat ? opts.heat.count : null;

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
      title={isTile ? `Tile #${el.tileNumber}${visit != null ? ` · ${visit} visits` : ""}` : el.name}
    >
      <div className="flex flex-col items-center justify-center gap-0.5 pointer-events-none px-0.5 w-full overflow-hidden">
        <Icon size={iconSize} style={{ color: iconColor, opacity: 0.95 }} />
        <span
          className="font-medium truncate max-w-full leading-none"
          style={{ fontSize, color: textColor }}
        >
          {labelText}
        </span>
        {visit != null && visit > 0 && (
          <span
            className="font-mono leading-none"
            style={{ fontSize: Math.max(6, fontSize - 2), color: textColor, opacity: 0.85 }}
          >
            {visit}
          </span>
        )}
      </div>
    </div>
  );
}

export function DemoHeatMap() {
  const { events } = useFloorData(2000, { demo: true });
  const { elements } = useDemoLayout();

  const counts = useMemo(() => {
    const week = Date.now() - 7 * 86400000;
    const map = new Map<number, number>();
    for (const e of events) {
      if (e.epoch < week) continue;
      const idx = ZONE_ORDER.indexOf(e.sensor);
      const tn = idx >= 0 ? idx + 1 : -1;
      if (tn < 0) continue;
      map.set(tn, (map.get(tn) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const tileEls = elements.filter((e) => e.type === "tile" && e.tileNumber != null);
  const maxCount = Math.max(1, ...tileEls.map((e) => counts.get(e.tileNumber!) ?? 0));

  return (
    <section className="max-w-[1400px] mx-auto px-6 pt-4 pb-12">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-display text-text" style={{ fontSize: 22, fontWeight: 600 }}>
            Heat Map <span className="text-text3 text-xs uppercase tracking-wider ml-2">Preview</span>
          </h2>
          <p className="text-text3 text-sm mt-1">
            Same layout you build in the Outline tab — sensor tiles colored by visits over the past week.
          </p>
        </div>
      </div>
      <div className="panel p-4">
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            aspectRatio: `${OUTLINE_COLS}/${OUTLINE_ROWS}`,
            background: "var(--surf)",
            border: "1px solid var(--bord2)",
          }}
        >
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
          {elements.map((el) =>
            renderOutlineBox(el, {
              heat:
                el.type === "tile" && el.tileNumber != null
                  ? { count: counts.get(el.tileNumber) ?? 0, max: maxCount }
                  : undefined,
            }),
          )}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <span className="text-text3 text-xs">Less</span>
          <div className="flex-1 h-3 rounded-full overflow-hidden flex">
            {Array.from({ length: 40 }).map((_, i) => {
              const [r, g, b] = heatRGB(i / 39);
              return <span key={i} style={{ flex: 1, background: `rgb(${r},${g},${b})` } as CSSProperties} />;
            })}
          </div>
          <span className="text-text3 text-xs">More visits</span>
          <span className="text-text3 text-xs font-mono ml-2">peak {maxCount}</span>
        </div>
      </div>
    </section>
  );
}

export function DemoOutline() {
  const { elements, setElements, save } = useDemoLayout();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const handleSave = () => {
    save();
    setSavedAt(Date.now());
  };

  return (
    <section className="max-w-[1400px] mx-auto px-6 pt-4 pb-2">
      <div className="mb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-text" style={{ fontSize: 22, fontWeight: 600 }}>
            Outline Builder <span className="text-text3 text-xs uppercase tracking-wider ml-2">Preview</span>
          </h2>
          <p className="text-text3 text-sm mt-1">
            Sketch your room layout and place each registered tile where it lives on the floor.
          </p>
        </div>
        {savedAt && (
          <div className="text-text3 text-xs">Saved · {new Date(savedAt).toLocaleTimeString()}</div>
        )}
      </div>
      <OutlineBuilder
        elements={elements}
        onChange={setElements}
        registeredTiles={DEMO_TILES.map((t) => ({ tile_number: t.tile_number, label: t.label }))}
        onSave={handleSave}
      />
    </section>
  );
}
