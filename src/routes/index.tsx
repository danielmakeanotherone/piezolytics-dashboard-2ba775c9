import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { HeroStats } from "@/components/HeroStats";
import { IsoHeatmap } from "@/components/IsoHeatmap";
import { Sparkline } from "@/components/Sparkline";
import { ZoneRankings } from "@/components/ZoneRankings";
import { ActivityTable } from "@/components/ActivityTable";
import { useFloorData } from "@/hooks/use-floor-data";
import { bucketSparkline } from "@/lib/floor-data";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { events, stats, conn, lastUpdate, refresh, clearAll } = useFloorData();
  const spark = bucketSparkline(events, 28);

  return (
    <div className="min-h-screen bg-bg text-text">
      <NavBar conn={conn} lastUpdate={lastUpdate} onRefresh={refresh} onClear={clearAll} />
      <main className="max-w-[1400px] mx-auto px-6 pb-12">
        <HeroStats stats={stats} />

        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 290px", height: 530 }}>
          <section className="panel flex flex-col">
            <div className="px-6 pt-5 pb-2 flex items-baseline justify-between">
              <h2 className="text-text font-medium">Activity Heatmap</h2>
              <span className="text-text3 text-xs">elevation = visit count · {stats.total} total</span>
            </div>
            <div className="flex-1 min-h-0">
              <IsoHeatmap stats={stats} />
            </div>
            <div className="px-6 pb-4">
              <div className="text-text3 text-[11px] uppercase tracking-wider mb-1.5">
                Event frequency over time
              </div>
              <Sparkline data={spark} />
            </div>
          </section>

          <section className="panel flex flex-col">
            <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
              <h2 className="text-text font-medium">Zone Rankings</h2>
              <span className="text-text3 text-xs">{stats.activeZones} active</span>
            </div>
            <div className="px-4 pb-4 flex-1 overflow-auto">
              <ZoneRankings stats={stats} />
            </div>
          </section>
        </div>

        <ActivityTable events={events} />
      </main>
    </div>
  );
}
