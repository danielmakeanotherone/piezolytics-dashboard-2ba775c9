import { ZONE_LABELS } from "@/lib/floor-data";
import type { Stats } from "@/lib/floor-data";

export function HeroStats({ stats }: { stats: Stats }) {
  const cards: { label: string; value: string; color: string }[] = [];

  return (
    <section className="flex items-end justify-between gap-8 py-8">
      <div>
        <h1 className="font-display text-text" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>
          Floor Analytics
        </h1>
        <p className="text-text3 text-sm mt-2">
          Live piezo sensor monitoring · {stats.activeZones} of 4 zones active
        </p>
      </div>
      <div className="flex gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="text-right px-5 py-4"
            style={{
              minWidth: 108,
              background: "var(--surf)",
              border: "1px solid rgba(255,255,255,0.055)",
              borderRadius: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,.35)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color, fontFamily: "Inter" }}>{c.value}</div>
            <div className="text-text3" style={{ fontSize: 11, marginTop: 2, letterSpacing: 0.3 }}>
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
