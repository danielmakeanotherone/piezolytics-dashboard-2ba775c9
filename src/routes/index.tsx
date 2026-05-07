import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { HeroStats } from "@/components/HeroStats";
import { IsoHeatmap } from "@/components/IsoHeatmap";
import { Sparkline } from "@/components/Sparkline";
import { useFloorData } from "@/hooks/use-floor-data";
import { bucketSparkline, ZONE_LABELS, ZONE_ORDER, formatTime } from "@/lib/floor-data";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Wave({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = ref.current, w = wrap.current;
    if (!c || !w) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.floor(w.clientWidth)), H = 110;
    const pixelW = Math.floor(W * dpr), pixelH = Math.floor(H * dpr);
    if (c.width !== pixelW) c.width = pixelW;
    if (c.height !== pixelH) c.height = pixelH;
    c.style.width = `${W}px`; c.style.height = `${H}px`;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (data.length < 2) return;
    const max = Math.max(1, ...data);
    const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - 14 - (v / max) * (H - 28)] as const);
    // smooth path
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const cx = (x0 + x1) / 2;
      ctx.quadraticCurveTo(x0, y0, cx, (y0 + y1) / 2);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    // fill area
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "rgba(200,168,118,0.35)");
    grd.addColorStop(1, "rgba(200,168,118,0)");
    ctx.fillStyle = grd; ctx.fill();
    // stroke
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const cx = (x0 + x1) / 2;
      ctx.quadraticCurveTo(x0, y0, cx, (y0 + y1) / 2);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.strokeStyle = "var(--acc)";
    ctx.strokeStyle = "#c8a876";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [data]);
  return <div ref={wrap} style={{ width: "100%", height: 110, overflow: "hidden" }}><canvas ref={ref} style={{ display: "block" }} /></div>;
}

function Dashboard() {
  const { events, stats, conn, lastUpdate, refresh, clearAll } = useFloorData();
  const [timeLabels, setTimeLabels] = useState({ today: "Today", clock: "--:--" });
  const spark = bucketSparkline(events, 28);
  const hourly = bucketSparkline(events, 36);

  const peakPct = stats.total ? Math.round((stats.maxCount / stats.total) * 100) : 0;
  const lastEvent = events.length ? [...events].sort((a, b) => b.epoch - a.epoch)[0] : null;

  useEffect(() => {
    const updateTimeLabels = () => {
      const now = new Date();
      setTimeLabels({
        today: `Today · ${now.toLocaleDateString([], { month: "short", day: "numeric" })}`,
        clock: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      });
    };
    updateTimeLabels();
    const id = window.setInterval(updateTimeLabels, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text">
      <NavBar conn={conn} lastUpdate={lastUpdate} onRefresh={refresh} onClear={clearAll} />
      <main className="max-w-[1400px] mx-auto px-6 pb-12">
        <HeroStats stats={stats} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left: Heatmap panel */}
          <section className="panel flex min-w-0 flex-col h-full">
            <div className="px-7 pt-6 pb-1 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-text" style={{ fontSize: 22, fontWeight: 600 }}>
                  Floor heatmap
                </h2>
                <span
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
                  style={{ background: "var(--surf2)", color: "var(--text2)", border: "1px solid var(--bord2)" }}
                >
                  <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: 999, background: "var(--acc)" }} />
                  {conn === "demo" ? "Demo stream" : conn === "live" ? "All sensors connected" : "Offline"}
                </span>
              </div>
              <div
                className="text-[11px] px-3 py-1.5 rounded-lg"
                style={{ background: "var(--surf2)", color: "var(--text2)", border: "1px solid var(--bord2)" }}
              >
                {timeLabels.today}
              </div>
            </div>
            <div className="px-7 pt-1 pb-2 text-text3 text-[12px] flex items-center gap-4">
              <span>⌖ 4-zone grid · 2×2</span>
              <span>{timeLabels.clock}</span>
            </div>
            <div className="flex-1 min-h-0">
              <IsoHeatmap stats={stats} />
            </div>
          </section>

          {/* Right: stacked cards */}
          <aside className="flex min-w-0 flex-col gap-5">
            {/* Traffic intensity */}
            <div className="panel p-6">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-text font-medium">Traffic intensity</div>
                  <div className="text-text3 text-[12px] mt-1">
                    Peak Zone: {stats.peakZone ? ZONE_LABELS[stats.peakZone] : "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--acc)", fontFamily: "Inter" }}>
                    {stats.total}
                  </div>
                  <div className="text-text3" style={{ fontSize: 10, letterSpacing: 0.3 }}>
                    Total events
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display" style={{ fontSize: 44, fontWeight: 600, color: "var(--text)" }}>
                  {peakPct}
                </span>
                <span className="text-text2 text-2xl">%</span>
                <span className="ml-auto text-[11px] text-text3">
                  share <span style={{ color: "var(--acc)" }}>↗</span>
                </span>
              </div>
              <div className="mt-2">
                <Wave data={spark} />
              </div>
              <div className="flex justify-between text-text3 text-[10px] mt-1">
                <span>−60m</span><span>−45m</span><span>−30m</span><span>−15m</span><span>now</span>
              </div>
            </div>

            {/* Sensor health */}
            <div className="panel p-6">
              <div className="flex items-baseline justify-between">
                <div className="text-text font-medium">Sensor health</div>
                <div className="text-text3 text-[11px]">{stats.activeZones} of 4 reporting</div>
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                {ZONE_ORDER.map((z) => {
                  const active = stats.counts[z] > 0;
                  return (
                    <div key={z} className="flex items-center justify-between text-[13px]">
                      <div className="flex items-center gap-2 text-text2">
                        <span
                          className={active ? "pulse-dot" : ""}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            background: active ? "var(--acc)" : "var(--text4)",
                            display: "inline-block",
                          }}
                        />
                        {ZONE_LABELS[z]}
                      </div>
                      <span className="text-text3 font-mono text-[11px]">
                        {active ? `${stats.counts[z]} hits` : "idle"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div
                className="mt-4 pt-3 flex items-center justify-between text-[11px] text-text3"
                style={{ borderTop: "1px solid var(--bord2)" }}
              >
                <span>Last event</span>
                <span className="font-mono">{lastEvent ? formatTime(lastEvent.epoch) : "—"}</span>
              </div>
            </div>

            {/* Hourly density */}
            <div className="panel p-6">
              <div className="flex items-baseline justify-between">
                <div className="text-text font-medium">Hourly density</div>
                <div
                  className="text-text3 text-[10px] px-2 py-0.5 rounded-md"
                  style={{ border: "1px solid var(--bord2)" }}
                >
                  60m
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display" style={{ fontSize: 36, fontWeight: 600, color: "var(--text)" }}>
                  {stats.total}
                </span>
                <span className="text-text3 text-[12px]">events captured</span>
              </div>
              <div className="mt-3">
                <Sparkline data={hourly} height={56} />
              </div>
              <div className="flex justify-between text-text3 text-[10px] mt-1">
                <span>0%</span><span>100%</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
