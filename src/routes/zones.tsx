import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { useFloorData } from "@/hooks/use-floor-data";
import { useTiles } from "@/hooks/use-tiles";
import { useAuthSession } from "@/hooks/use-auth";
import { isTileConnected, tileKey, tileLabel } from "@/lib/floor-data";

export const Route = createFileRoute("/zones")({
  head: () => ({
    meta: [
      { title: "Tile Manager — Piezolytics" },
      { name: "description", content: "Add and manage your floor tiles." },
    ],
  }),
  component: TileManagerPage,
});

function TileManagerPage() {
  const { session, loading: authLoading } = useAuthSession();
  const navigate = useNavigate();
  const { tiles, loading: tilesLoading, addTile, deleteTile, error } = useTiles();
  const { stats, conn, lastUpdate, refresh, clearAll } = useFloorData(tiles);

  const [num, setNum] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/auth", search: { mode: "login" } });
  }, [authLoading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const n = parseInt(num, 10);
    if (!Number.isFinite(n) || n < 1 || n > 999) {
      setFormError("Enter a tile number between 1 and 999");
      return;
    }
    if (tiles.some((t) => t.number === n)) {
      setFormError(`Tile #${n} already exists`);
      return;
    }
    setBusy(true);
    const { error } = await addTile(n, label.trim() || undefined);
    setBusy(false);
    if (error) setFormError(error);
    else {
      setNum("");
      setLabel("");
    }
  };

  if (authLoading || !session) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <span className="text-text3 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <NavBar conn={conn} lastUpdate={lastUpdate} onRefresh={refresh} onClear={clearAll} />
      <main className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="flex items-end justify-between gap-6 mb-6 flex-wrap">
          <div>
            <h1 className="font-display text-text" style={{ fontSize: 32, fontWeight: 600 }}>
              Tile Manager
            </h1>
            <p className="text-text3 text-[13px] mt-1.5 max-w-[560px]">
              Add a tile by entering its number. Your ESP32 should report events with the sensor
              tag <code className="font-mono text-text2">tile_&lt;n&gt;</code> (e.g. <code className="font-mono text-text2">tile_3</code>).
            </p>
          </div>
          {tiles.length > 0 && (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: "var(--acc)", color: "#1a1410", fontWeight: 500 }}
            >
              Open Dashboard →
            </Link>
          )}
        </div>

        <form onSubmit={submit} className="panel p-5 flex flex-wrap items-end gap-3 mb-6">
          <label className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <span className="text-[11px] uppercase tracking-wider text-text3">Tile number</span>
            <input
              type="number" min={1} max={999} required value={num}
              onChange={(e) => setNum(e.target.value)}
              placeholder="e.g. 3"
              className="px-3 py-2.5 rounded-lg text-sm font-mono"
              style={{ background: "var(--surf2)", border: "1px solid var(--bord2)", color: "var(--text)" }}
            />
          </label>
          <label className="flex flex-col gap-1.5 flex-[2] min-w-[200px]">
            <span className="text-[11px] uppercase tracking-wider text-text3">Label (optional)</span>
            <input
              type="text" maxLength={40} value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Entrance"
              className="px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surf2)", border: "1px solid var(--bord2)", color: "var(--text)" }}
            />
          </label>
          <button
            type="submit" disabled={busy}
            className="px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--acc)", color: "#1a1410" }}
          >
            {busy ? "Adding…" : "Add tile"}
          </button>
          {(formError || error) && (
            <div className="text-[12px] w-full px-3 py-2 rounded-md" style={{ background: "rgba(220,80,60,0.12)", color: "#ff9a8a", border: "1px solid rgba(220,80,60,0.3)" }}>
              {formError ?? error}
            </div>
          )}
        </form>

        {tilesLoading && tiles.length === 0 ? (
          <div className="panel p-12 text-center text-text3 text-sm">Loading tiles…</div>
        ) : tiles.length === 0 ? (
          <div className="panel p-12 text-center">
            <div className="font-display text-text" style={{ fontSize: 22, fontWeight: 600 }}>
              No tiles yet
            </div>
            <p className="text-text3 text-sm mt-2 max-w-[420px] mx-auto">
              Add your first tile above to start tracking. Tiles light up automatically when your
              ESP32 starts reporting.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map((t) => {
              const c = stats.counts[tileKey(t.number)] ?? 0;
              const connected = isTileConnected(stats, t);
              return (
                <div key={t.id} className="panel p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-text3 text-[10px] uppercase tracking-[0.18em]">
                        Sensor tag · {tileKey(t.number)}
                      </div>
                      <div className="font-display text-text mt-0.5" style={{ fontSize: 20, fontWeight: 600 }}>
                        {tileLabel(t)}
                      </div>
                    </div>
                    <span
                      className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full"
                      style={{
                        background: "var(--surf2)",
                        color: connected ? "var(--acc)" : "var(--text3)",
                        border: "1px solid var(--bord2)",
                      }}
                    >
                      <span
                        className={connected ? "pulse-dot" : ""}
                        style={{
                          width: 6, height: 6, borderRadius: 999,
                          background: connected ? "var(--acc)" : "var(--text4)",
                          display: "inline-block",
                        }}
                      />
                      {connected ? "Connected" : "Awaiting"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-display" style={{ fontSize: 28, fontWeight: 600, color: "var(--acc)" }}>
                      {c}
                    </span>
                    <span className="text-text3 text-[11px]">events captured</span>
                  </div>
                  <div className="mt-4 pt-3 flex justify-end" style={{ borderTop: "1px solid var(--bord2)" }}>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${tileLabel(t)}?`)) deleteTile(t.id);
                      }}
                      className="text-[12px] px-3 py-1.5 rounded-md"
                      style={{ background: "transparent", color: "var(--text3)", border: "1px solid var(--bord2)" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
