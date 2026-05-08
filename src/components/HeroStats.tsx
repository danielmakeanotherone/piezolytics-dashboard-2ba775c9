import type { Stats } from "@/lib/floor-data";

export function HeroStats({ stats, userName, totalTiles }: { stats: Stats; userName?: string; totalTiles: number }) {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <section className="flex items-end justify-between gap-8 py-8">
      <div>
        {userName && (
          <div className="text-text3 text-[12px] uppercase tracking-[0.18em] mb-2">
            {greeting}
          </div>
        )}
        <h1 className="font-display text-text" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.1 }}>
          {userName ? <>Hey {userName}, <span style={{ color: "var(--acc)" }}>Welcome Back</span>!</> : "Floor Analytics"}
        </h1>
        <p className="text-text3 text-sm mt-2">
          Live piezo sensor monitoring · {stats.activeTiles} of {totalTiles} {totalTiles === 1 ? "tile" : "tiles"} active
        </p>
      </div>
    </section>
  );
}
