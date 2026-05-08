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

function OutlinePage() {
  const { conn, lastUpdate, refresh, clearAll } = useFloorData();
  const { tiles, loading: tilesLoading } = useUserTiles();
  const { elements: serverEls, loading: layoutLoading, saving, save } = useRoomLayout();
  const [elements, setElements] = useState<OutlineElement[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!layoutLoading) setElements(serverEls);
  }, [serverEls, layoutLoading]);

  const handleSave = async () => {
    await save(elements);
    setSavedAt(Date.now());
  };

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
          {savedAt && (
            <div className="text-text3 text-xs">
              Saved · {new Date(savedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {layoutLoading || tilesLoading ? (
          <div className="text-text3 text-sm">Loading…</div>
        ) : (
          <OutlineBuilder
            elements={elements}
            onChange={setElements}
            registeredTiles={tiles.map((t) => ({ tile_number: t.tile_number, label: t.label }))}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </main>
    </div>
  );
}
