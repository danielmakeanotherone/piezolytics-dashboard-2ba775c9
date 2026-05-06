import { ZONE_LABELS, ZONE_ORDER, type Stats } from "@/lib/floor-data";

export function ZoneRankings({ stats }: { stats: Stats }) {
  const sorted = [...ZONE_ORDER].sort((a, b) => stats.counts[b] - stats.counts[a]);
  const total = stats.total || 1;
  return (
    <div className="flex flex-col gap-3">
      {sorted.map((z) => {
        const c = stats.counts[z];
        const pct = (c / total) * 100;
        const norm = stats.maxCount ? c / stats.maxCount : 0;
        return (
          <div
            key={z}
            className="px-4 py-3.5"
            style={{
              background: "var(--surf2)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.03)",
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-text text-sm font-medium">{ZONE_LABELS[z]}</span>
              <div className="text-right">
                <span style={{ color: "var(--acc)", fontSize: 20, fontWeight: 700, fontFamily: "Inter" }}>
                  {c}
                </span>
                <div className="text-text3 text-[11px] mt-0.5">{pct.toFixed(1)}% of traffic</div>
              </div>
            </div>
            <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "var(--surf3)" }}>
              <div
                style={{
                  width: `${Math.max(4, norm * 100)}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--acc3), var(--acc))",
                  transition: "width .5s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
