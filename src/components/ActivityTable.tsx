import { formatTime, ZONE_LABELS, type FloorEvent } from "@/lib/floor-data";

export function ActivityTable({ events, limit = 20 }: { events: FloorEvent[]; limit?: number }) {
  const rows = [...events].sort((a, b) => b.epoch - a.epoch).slice(0, limit);
  return (
    <div className="panel mt-6">
      <div className="px-6 pt-5 pb-3 flex items-baseline justify-between">
        <h3 className="text-text font-medium">Recent Activity</h3>
        <span className="text-text3 text-xs">last {limit}</span>
      </div>
      <div className="px-6 pb-5">
        <div
          className="grid text-text3 text-[11px] uppercase tracking-wider px-3 py-2"
          style={{ gridTemplateColumns: "180px 1fr 120px", borderBottom: "1px solid var(--bord2)" }}
        >
          <div>Time</div>
          <div>Zone</div>
          <div className="text-right">Signal</div>
        </div>
        {rows.length === 0 && (
          <div className="text-text3 text-sm py-8 text-center">No events yet — waiting for sensors…</div>
        )}
        {rows.map((e, i) => (
          <div
            key={`${e.epoch}-${i}`}
            className="grid items-center px-3 py-2.5 text-sm hover:bg-surf2 rounded-lg transition-colors"
            style={{ gridTemplateColumns: "180px 1fr 120px" }}
          >
            <div className="text-text2 font-mono text-[13px]">{formatTime(e.epoch)}</div>
            <div className="text-text">{ZONE_LABELS[e.sensor] ?? e.sensor}</div>
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
        ))}
      </div>
    </div>
  );
}
