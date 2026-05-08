import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { useFloorData } from "@/hooks/use-floor-data";
import { useUserTiles } from "@/hooks/use-user-tiles";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/zones")({
  head: () => ({
    meta: [
      { title: "Tile Manager — Piezolytics" },
      { name: "description", content: "Register and manage your floor tiles." },
    ],
  }),
  component: ZonesPage,
});

function ZonesPage() {
  const { conn, lastUpdate, refresh, clearAll } = useFloorData();
  const { tiles, loading, error, addTile, removeTile } = useUserTiles();
  const [adding, setAdding] = useState(false);
  const [tileNum, setTileNum] = useState("");
  const [tileLabel, setTileLabel] = useState("");
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErr(null);
    const n = parseInt(tileNum, 10);
    if (!Number.isInteger(n) || n < 1 || n > 9999) {
      setSubmitErr("Enter a tile number between 1 and 9999");
      return;
    }
    const label = tileLabel.trim();
    if (!label) {
      setSubmitErr("Enter a location name");
      return;
    }
    if (label.length > 60) {
      setSubmitErr("Location name must be 60 characters or fewer");
      return;
    }
    if (tiles.some((t) => t.tile_number === n)) {
      setSubmitErr(`Tile #${n} is already registered`);
      return;
    }
    setBusy(true);
    try {
      await addTile(n, label);
      setTileNum("");
      setTileLabel("");
      setAdding(false);
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : "Failed to add tile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <NavBar conn={conn} lastUpdate={lastUpdate} onRefresh={refresh} onClear={clearAll} />
      <main className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-display text-text" style={{ fontSize: 28, fontWeight: 600 }}>
              Tile Manager
            </h1>
            <p className="text-text3 text-sm mt-1">
              Register the tile IDs hardcoded into your ESP32 devices and label each location.
            </p>
          </div>
          {!adding && (
            <button
              onClick={() => { setAdding(true); setSubmitErr(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "var(--acc)", color: "#1a1611" }}
            >
              <Plus size={16} /> Add Tile
            </button>
          )}
        </div>

        {adding && (
          <form onSubmit={handleAdd} className="panel p-5 mb-6 flex items-end gap-3 flex-wrap">
            <div style={{ width: 110 }}>
              <label className="text-text3 text-[11px] uppercase tracking-wider block mb-1.5">
                Tile #
              </label>
              <input
                type="number"
                min={1}
                max={9999}
                step={1}
                inputMode="numeric"
                autoFocus
                value={tileNum}
                onChange={(e) => setTileNum(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="1"
                className="w-full px-3 py-2 rounded-lg text-text bg-transparent"
                style={{ border: "1px solid var(--bord2)" }}
              />
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="text-text3 text-[11px] uppercase tracking-wider block mb-1.5">
                Location name
              </label>
              <input
                type="text"
                maxLength={60}
                value={tileLabel}
                onChange={(e) => setTileLabel(e.target.value)}
                placeholder="e.g. Front Entrance"
                className="w-full px-3 py-2 rounded-lg text-text bg-transparent"
                style={{ border: "1px solid var(--bord2)" }}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--acc)", color: "#1a1611" }}
            >
              {busy ? "Adding…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setTileNum(""); setTileLabel(""); setSubmitErr(null); }}
              className="px-4 py-2 rounded-lg text-sm text-text2 hover:text-text"
              style={{ border: "1px solid var(--bord2)" }}
            >
              Cancel
            </button>
            {submitErr && <div className="basis-full text-xs" style={{ color: "#e07a6a" }}>{submitErr}</div>}
          </form>
        )}

        {loading ? (
          <div className="text-text3 text-sm">Loading tiles…</div>
        ) : error ? (
          <div className="text-sm" style={{ color: "#e07a6a" }}>{error}</div>
        ) : tiles.length === 0 ? (
          <div className="panel p-10 text-center">
            <div className="text-text2 text-base mb-1">No tiles registered yet</div>
            <div className="text-text3 text-sm">Click "Add Tile" to register the first one.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map((t) => (
              <div key={t.id} className="panel p-5 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-display text-text truncate" style={{ fontSize: 22, fontWeight: 600 }}>
                    {t.label || `Tile ${t.tile_number}`}
                  </div>
                  <div className="font-mono text-text3 text-[12px] mt-1">
                    tile_{t.tile_number}
                  </div>
                </div>
                <button
                  onClick={() => removeTile(t.id)}
                  aria-label={`Remove tile ${t.tile_number}`}
                  className="p-2 rounded-lg text-text3 hover:text-text hover:bg-surf2 transition-colors"
                  style={{ border: "1px solid var(--bord2)" }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
