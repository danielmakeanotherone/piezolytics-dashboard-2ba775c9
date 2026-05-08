import { useMemo, useState } from "react";
import { useFloorData } from "@/hooks/use-floor-data";
import { ZONE_ORDER, formatTime } from "@/lib/floor-data";
import { Plus, Pencil, Trash2 } from "lucide-react";

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
            History <span className="text-text3 text-xs uppercase tracking-wider ml-2">Preview</span>
          </h2>
          <p className="text-text3 text-sm mt-1">
            Per-tile event history sourced from the simulated stream.
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
