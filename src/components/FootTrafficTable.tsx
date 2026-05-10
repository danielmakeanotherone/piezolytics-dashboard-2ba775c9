import type { FootTrafficRow } from "@/lib/foot-traffic";

function fmt(epoch: number) {
  const d = new Date(epoch);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function FootTrafficTable({ rows, limit = 25 }: { rows: FootTrafficRow[]; limit?: number }) {
  const data = rows.slice(0, limit);
  return (
    <div className="panel mt-6">
      <div className="px-6 pt-5 pb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-text font-medium">Live Foot Traffic</h3>
          <div className="text-text3 text-[11px] mt-0.5">Streaming from foot_traffic · realtime</div>
        </div>
        <span className="text-text3 text-xs">latest {data.length}</span>
      </div>
      <div className="px-6 pb-5">
        <div
          className="grid text-text3 text-[11px] uppercase tracking-wider px-3 py-2"
          style={{
            gridTemplateColumns: "100px 110px 140px 1fr",
            borderBottom: "1px solid var(--bord2)",
          }}
        >
          <div>Tile ID</div>
          <div className="text-right">Tile A Peak</div>
          <div className="text-right">Tile A Dwell (ms)</div>
          <div className="text-right">Created At</div>
        </div>
        {data.length === 0 && (
          <div className="text-text3 text-sm py-8 text-center">
            Waiting for first row from foot_traffic…
          </div>
        )}
        {data.map((r, i) => (
          <div
            key={`${r.id ?? r.created_at}-${i}`}
            className="grid items-center px-3 py-2.5 text-sm hover:bg-surf2 rounded-lg transition-colors"
            style={{ gridTemplateColumns: "100px 110px 140px 1fr" }}
          >
            <div className="text-text font-mono text-[13px]">tile_{String(r.tile_id ?? "—")}</div>
            <div className="text-right">
              <span
                className="inline-block px-2.5 py-0.5 rounded-md font-mono text-[12px]"
                style={{
                  background: "rgba(200,168,118,0.12)",
                  color: "var(--acc)",
                  border: "1px solid rgba(200,168,118,0.22)",
                }}
              >
                {r.tile_a_peak ?? "—"}
              </span>
            </div>
            <div className="text-right text-text2 font-mono text-[13px]">
              {r.tile_a_dwell_ms ?? "—"}
            </div>
            <div className="text-right text-text3 font-mono text-[12px]">
              {fmt(new Date(r.created_at).getTime())}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
