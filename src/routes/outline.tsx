import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { OutlineBuilder, type OutlineElement } from "@/components/OutlineBuilder";
import { useFloorData } from "@/hooks/use-floor-data";
import { useUserTiles } from "@/hooks/use-user-tiles";
import { useRoomLayout } from "@/hooks/use-room-layout";

export const Route = createFileRoute("/outline")({
  head: () => ({
    meta: [
      { title: "Outline Builder — Piezolytics" },
      { name: "description", content: "Sketch your room layout and place registered tiles where they live." },
    ],
  }),
  component: OutlinePage,
});

const SIZE_PRESETS = [
  { key: "small",  label: "Small",  cols: 16, rows: 10, blurb: "Café · single room" },
  { key: "medium", label: "Medium", cols: 24, rows: 16, blurb: "Convenience store" },
  { key: "large",  label: "Large",  cols: 32, rows: 22, blurb: "Supermarket · open floor" },
] as const;

function OutlinePage() {
  const { conn, lastUpdate, refresh, clearAll } = useFloorData();
  const { tiles, loading: tilesLoading } = useUserTiles();
  const {
    elements: serverEls,
    cols: serverCols,
    rows: serverRows,
    hasSavedLayout,
    loading: layoutLoading,
    saving,
    save,
  } = useRoomLayout();
  const [elements, setElements] = useState<OutlineElement[]>([]);
  const [cols, setCols] = useState<number>(24);
  const [rows, setRows] = useState<number>(16);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    if (layoutLoading) return;
    setElements(serverEls);
    setCols(serverCols);
    setRows(serverRows);
    if (hasSavedLayout) setPicked(true);
  }, [serverEls, serverCols, serverRows, hasSavedLayout, layoutLoading]);

  const handleSave = async () => {
    await save(elements, cols, rows);
    setSavedAt(Date.now());
  };

  const choose = (c: number, r: number) => {
    setCols(c);
    setRows(r);
    setPicked(true);
  };

  const showPicker = !layoutLoading && !hasSavedLayout && !picked;

  return (
    <div className="min-h-screen bg-bg text-text">
      <NavBar conn={conn} lastUpdate={lastUpdate} onRefresh={refresh} onClear={clearAll} />
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-text" style={{ fontSize: 28, fontWeight: 600 }}>
              Outline Builder
            </h1>
            <p className="text-text3 text-sm mt-1">
              Sketch your room and drop registered tiles where they sit on the floor.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!showPicker && (
              <span className="text-text3 text-xs font-mono">
                {cols} × {rows}
              </span>
            )}
            {savedAt && (
              <div className="text-text3 text-xs">
                Saved · {new Date(savedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {layoutLoading || tilesLoading ? (
          <div className="text-text3 text-sm">Loading…</div>
        ) : showPicker ? (
          <div className="panel p-6">
            <div className="font-display text-text mb-1" style={{ fontSize: 18, fontWeight: 600 }}>
              Pick a canvas size to start
            </div>
            <p className="text-text3 text-sm mb-5">
              You can keep working on your layout afterwards — this just sets the grid you have to work with.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {SIZE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => choose(p.cols, p.rows)}
                  className="text-left p-4 rounded-lg transition-colors hover:border-[var(--acc)]"
                  style={{ background: "var(--surf2)", border: "1px solid var(--bord2)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-text" style={{ fontSize: 16, fontWeight: 600 }}>
                      {p.label}
                    </span>
                    <span className="text-text3 text-[11px] font-mono">
                      {p.cols} × {p.rows}
                    </span>
                  </div>
                  <div className="text-text3 text-xs">{p.blurb}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <OutlineBuilder
            elements={elements}
            onChange={setElements}
            registeredTiles={tiles.map((t) => ({ tile_number: t.tile_number, label: t.label }))}
            cols={cols}
            rows={rows}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </main>
    </div>
  );
}
