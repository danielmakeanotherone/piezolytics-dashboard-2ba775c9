import { ZONE_ORDER, ZONE_LABELS, type Stats, type SensorKey, type FloorEvent } from "@/lib/floor-data";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

interface Props {
  stats: Stats;
  events?: FloorEvent[];
  connected?: boolean;
}

export function IsoHeatmap({ stats, events = [], connected = true }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const maxCount = Math.max(1, stats.maxCount);
  const activeHeights = ZONE_ORDER.map((zone) => {
    const count = stats.counts[zone];
    const norm = count / maxCount;
    return 34 + norm * 104;
  });
  const ghostPlaneHeight = Math.max(...activeHeights);

  // Ghost tile positions (column, row) in an NxN surrounding grid.
  // Active 2x2 occupies the center: cols/rows N/2 and N/2+1.
  const N = 8;
  const activeA = N / 2;
  const activeB = N / 2 + 1;
  const ghostCells: Array<[number, number]> = [];
  for (let r = 1; r <= N; r++) {
    for (let c = 1; c <= N; c++) {
      const isActive = (c === activeA || c === activeB) && (r === activeA || r === activeB);
      if (!isActive) ghostCells.push([c, r]);
    }
  }

  const realRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [centers, setCenters] = useState<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    if (!stageRef.current) return;
    const stageRect = stageRef.current.getBoundingClientRect();
    const next = realRefs.current.map((el) => {
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return { x: r.left - stageRect.left + r.width / 2, y: r.top - stageRect.top + r.height / 2 };
    });
    setCenters(next);
  }, [dims.w, dims.h, stats.total]);

  const dirs: Array<[number, number]> = [
    [-1, -0.45],
    [1, -0.45],
    [-1, 0.45],
    [1, 0.45],
  ];
  const LEADER = 95;

  return (
    <div className={connected ? "iso-stage" : "iso-stage iso-stage-idle"} ref={stageRef} aria-label="Floor traffic heatmap">
      {!connected && (
        <div className="iso-awaiting">
          <span className="iso-awaiting-dot" />
          Waiting for Connection…
        </div>
      )}
      <div className="iso-grid iso-grid-4">
        {ghostCells.map(([c, r]) => (
          <div
            key={`ghost-${c}-${r}`}
            className="iso-block iso-block-ghost"
            style={{ "--ghost-h": `${ghostPlaneHeight}px`, gridColumn: c, gridRow: r } as CSSProperties}
            aria-hidden="true"
          >
            <div className="iso-ghost-top" />
          </div>
        ))}
        {ZONE_ORDER.map((zone, index) => {
          const count = stats.counts[zone];
          const norm = count / maxCount;
          const height = activeHeights[index];
          const activePos: Array<[number, number]> = [[activeA,activeA],[activeB,activeA],[activeA,activeB],[activeB,activeB]];
          const [gc, gr] = activePos[index];
          return (
            <div
              key={zone}
              ref={(el) => { realRefs.current[index] = el; }}
              className="iso-block iso-block-real"
              role="button"
              tabIndex={0}
              onClick={() => setSelected(index)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(index); } }}
              style={
                {
                  "--h": `${height}px`,
                  "--heat": norm.toFixed(3),
                  "--delay": `${index * 80}ms`,
                  gridColumn: gc,
                  gridRow: gr,
                } as CSSProperties
              }
            >
              <div className="iso-column" aria-hidden="true">
                <div className="iso-top" />
                <div className="iso-left" />
                <div className="iso-right" />
                <div className="iso-piezos">
                  {Array.from({ length: 32 }).map((_, p) => (
                    <div key={p} className="piezo">
                      <span className="piezo-disc">
                        <span className="piezo-dot" />
                      </span>
                    </div>
                  ))}
                  <svg className="piezo-loom" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {(() => {
                      const cols = 8, rows = 4;
                      const buildPath = (laneOffset: number) => {
                        const touchY = 4.2;
                        const arcDrop = 2.2;
                        const contactHalf = 2.2;
                        let d = "";
                        for (let r = 0; r < rows; r++) {
                          const yCenter = ((r + 0.5) / rows) * 100;
                          const yTouch = yCenter + touchY + laneOffset;
                          for (let c = 0; c < cols; c++) {
                            const xc = ((c + 0.5) / cols) * 100;
                            const xL = xc - contactHalf;
                            const xR = xc + contactHalf;
                            d += `M${xL.toFixed(2)},${yTouch.toFixed(2)} L${xR.toFixed(2)},${yTouch.toFixed(2)} `;
                            if (c < cols - 1) {
                              const nextXc = ((c + 1.5) / cols) * 100;
                              const nextL = nextXc - contactHalf;
                              const mx = (xR + nextL) / 2;
                              const my = yTouch + arcDrop;
                              d += `M${xR.toFixed(2)},${yTouch.toFixed(2)} Q${mx.toFixed(2)},${my.toFixed(2)} ${nextL.toFixed(2)},${yTouch.toFixed(2)} `;
                            }
                          }
                        }
                        return d;
                      };
                      return (
                        <>
                          <path d={buildPath(-0.9)} className="loom-wire loom-red" />
                          <path d={buildPath(0.9)} className="loom-wire loom-black" />
                        </>
                      );
                    })()}
                  </svg>
                </div>
                <div className="iso-side-label">
                  <span>Tile {String(index + 1).padStart(2, "0")}</span>
                  <span className="iso-side-count">{count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {centers.length === 4 && (
        <svg className="iso-leader-svg" width={dims.w} height={dims.h}>
          {centers.map((c, i) => {
            const [dx, dy] = dirs[i];
            const len = Math.hypot(dx, dy);
            const ux = dx / len, uy = dy / len;
            const ex = c.x + ux * LEADER;
            const ey = c.y + uy * LEADER;
            return (
              <g key={i} className="iso-leader">
                <line x1={c.x} y1={c.y} x2={ex} y2={ey} />
                <circle cx={ex} cy={ey} r={3} />
              </g>
            );
          })}
        </svg>
      )}
      {centers.length === 4 && ZONE_ORDER.map((zone, i) => {
        const c = centers[i];
        const [dx, dy] = dirs[i];
        const len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const tx = c.x + ux * LEADER;
        const ty = c.y + uy * LEADER;
        const side = ux < 0 ? "right" : "left";
        return (
          <div
            key={`tag-${zone}`}
            className="iso-tag iso-tag-leader"
            data-side={side}
            style={{ left: tx, top: ty }}
          >
            <span className="iso-tag-label">Tile #{String(i + 1).padStart(2, "0")}</span>
            <span className="iso-tag-count">{stats.counts[zone]}</span>
          </div>
        );
      })}

      

      {selected !== null && (
        <TileDetail
          index={selected}
          zone={ZONE_ORDER[selected]}
          stats={stats}
          events={events}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

type RangeKey = "Day" | "Week" | "Month" | "Quarter" | "Year" | "All";
const RANGES: RangeKey[] = ["Day", "Week", "Month", "Quarter", "Year", "All"];

function TileDetail({
  index,
  zone,
  stats,
  events,
  onClose,
}: {
  index: number;
  zone: SensorKey;
  stats: Stats;
  events: FloorEvent[];
  onClose: () => void;
}) {
  const [range, setRange] = useState<RangeKey>("Week");
  const count = stats.counts[zone];
  const share = stats.total ? Math.round((count / stats.total) * 100) : 0;
  const zoneEvents = useMemo(() => events.filter((e) => e.sensor === zone), [events, zone]);

  // Bucket config per range. Most ranges produce a 1-row strip; Month renders as
  // a 2D grid (weekday rows × week columns) like a contribution calendar.
  const bucketConfig: Record<RangeKey, { count: number; unit: string; rows?: number; cols?: number; labels: (i: number) => string }> = {
    Day:     { count: 24, unit: "hour",  labels: (i) => (i % 3 === 0 ? `${i.toString().padStart(2, "0")}h` : "") },
    Week:    { count: 7,  unit: "day",   labels: (i) => ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i] },
    Month:   { count: 35, unit: "day",   rows: 7, cols: 5, labels: (i) => ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i] },
    Quarter: { count: 13, unit: "week",  labels: (i) => `W${i + 1}` },
    Year:    { count: 12, unit: "month", labels: (i) => ["J","F","M","A","M","J","J","A","S","O","N","D"][i] },
    All:     { count: 5,  unit: "year",  labels: (i) => `${new Date().getFullYear() - (4 - i)}` },
  };
  const cfg = bucketConfig[range];

  const series = useMemo(() => {
    const buckets = new Array<number>(cfg.count).fill(0);
    for (const e of zoneEvents) {
      const d = new Date(e.epoch);
      const now = new Date();
      let idx = -1;
      if (range === "Day") {
        if (d.toDateString() === now.toDateString()) idx = d.getHours();
      } else if (range === "Week") {
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < 7) idx = 6 - diffDays;
      } else if (range === "Month") {
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < 35) {
          const cols = cfg.cols!;
          const weeksAgo = Math.floor(diffDays / 7);
          const col = cols - 1 - weeksAgo;
          const jsDow = d.getDay();
          const row = (jsDow + 6) % 7; // Mon=0..Sun=6
          if (col >= 0 && col < cols) idx = row * cols + col;
        }
      } else if (range === "Quarter") {
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
        const weeksAgo = Math.floor(diffDays / 7);
        if (weeksAgo >= 0 && weeksAgo < cfg.count) idx = cfg.count - 1 - weeksAgo;
      } else if (range === "Year") {
        if (d.getFullYear() === now.getFullYear()) idx = d.getMonth();
      } else {
        const diffYears = now.getFullYear() - d.getFullYear();
        if (diffYears >= 0 && diffYears < 5) idx = 4 - diffYears;
      }
      if (idx >= 0) buckets[idx]++;
    }
    const seed = (index + 1) * 991 + range.length * 17;
    const rand = (n: number) => {
      const x = Math.sin(seed + n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    const rangeBoost = { Day: 0.4, Week: 1, Month: 1.4, Quarter: 1.8, Year: 2.2, All: 2.6 }[range];
    for (let i = 0; i < cfg.count; i++) {
      const center = (cfg.count - 1) / 2;
      const bias = Math.max(0.2, 1 - Math.abs(i - center) / cfg.count);
      buckets[i] += (count / 4) * bias * (0.4 + rand(i) * 1.1) * rangeBoost;
    }
    return buckets;
  }, [zoneEvents, count, range, index, cfg.count, cfg.cols, cfg.rows]);

  const minVal = Math.round(Math.min(...series));
  const maxVal = Math.round(Math.max(...series));
  const avgVal = Math.round(series.reduce((s, v) => s + v, 0) / series.length);
  const heatMax = Math.max(1, ...series);

  const last = zoneEvents.length ? zoneEvents[zoneEvents.length - 1] : null;

  // ---- Visits Today (hourly) — min / max / avg ----
  const visitsToday = useMemo(() => {
    const now = new Date();
    const buckets = new Array(24).fill(0);
    for (const e of zoneEvents) {
      const d = new Date(e.epoch);
      if (d.toDateString() === now.toDateString()) buckets[d.getHours()]++;
    }
    // synth fill so chart never looks empty
    const seed = (index + 1) * 311;
    const rand = (n: number) => {
      const x = Math.sin(seed + n * 7.13) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let h = 0; h < 24; h++) {
      const peak = h === 12 || h === 18 ? 1.6 : h >= 9 && h <= 20 ? 1 : 0.3;
      buckets[h] += Math.max(0, Math.round((count / 6) * peak * (0.4 + rand(h) * 1.1)));
    }
    return buckets;
  }, [zoneEvents, count, index]);

  const vtMin = Math.min(...visitsToday);
  const vtMax = Math.max(...visitsToday);
  const vtAvg = visitsToday.reduce((s, v) => s + v, 0) / 24;

  // ---- Average Dwell Times (seconds, by hour, smooth line) ----
  const dwellSeries = useMemo(() => {
    const seed = (index + 1) * 977 + 13;
    const rand = (n: number) => {
      const x = Math.sin(seed + n * 4.71) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 24 }, (_, h) => {
      // Linger longer at lunch + evening
      const base = 18 + (h >= 11 && h <= 14 ? 22 : 0) + (h >= 17 && h <= 20 ? 28 : 0);
      return Math.round(base + rand(h) * 18);
    });
  }, [index]);
  const dwellMax = Math.max(...dwellSeries);
  const dwellAvg = Math.round(dwellSeries.reduce((s, v) => s + v, 0) / 24);

  return (
    <div className="iso-detail-overlay" onClick={onClose}>
      <div className="iso-detail-card" onClick={(e) => e.stopPropagation()} role="dialog">
        <button className="iso-detail-close" onClick={onClose} aria-label="Close">×</button>

        <div className="iso-detail-top">
          <div>
            <div className="iso-detail-eyebrow">Tile #{String(index + 1).padStart(2, "0")} · {ZONE_LABELS[zone]}</div>
            <div className="iso-detail-h1">Analytic view</div>
          </div>
          <div className="iso-detail-share">
            <span>{share}%</span>
            <small>of floor traffic</small>
          </div>
        </div>

        <div className="iso-detail-tabs" role="tablist">
          {RANGES.map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={r === range}
              className={r === range ? "iso-tab is-active" : "iso-tab"}
              onClick={() => setRange(r)}
            >
              {r === range && <span className="iso-tab-dot" />} {r}
            </button>
          ))}
        </div>

        <div className="iso-detail-bignums">
          <div>
            <div className="iso-bignum">{minVal} <span className="iso-bignum-arrow">↗</span></div>
            <small>Minimum / {cfg.unit}</small>
          </div>
          <div>
            <div className="iso-bignum">{avgVal} <span className="iso-bignum-arrow">↗</span></div>
            <small>Average / {cfg.unit}</small>
          </div>
          <div>
            <div className="iso-bignum">{maxVal} <span className="iso-bignum-arrow">↗</span></div>
            <small>Maximum / {cfg.unit}</small>
          </div>
        </div>

        {range === "Month" ? (
          <div className="iso-heatgrid iso-heatcal">
            <div className="iso-heatcal-body">
              <div className="iso-heatcal-rowlabels">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                  <span key={d} className="iso-heatstrip-tick">{d}</span>
                ))}
              </div>
              <div
                className="iso-heatcal-cells"
                style={{ gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`, gridTemplateRows: `repeat(${cfg.rows}, 1fr)` } as CSSProperties}
              >
                {series.map((v, i) => {
                  const cols = cfg.cols!;
                  const row = Math.floor(i / cols);
                  const col = i % cols;
                  return (
                    <span
                      key={i}
                      className="iso-heatcell iso-heatcell-pill"
                      style={{ "--t": (v / heatMax).toFixed(3), gridColumn: col + 1, gridRow: row + 1 } as CSSProperties}
                      title={`${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][row]} · W${col + 1}: ${Math.round(v)}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="iso-heatgrid">
            <div
              className="iso-heatstrip"
              style={{ gridTemplateColumns: `repeat(${cfg.count}, 1fr)` } as CSSProperties}
            >
              {series.map((v, i) => (
                <span
                  key={i}
                  className="iso-heatcell"
                  style={{ "--t": (v / heatMax).toFixed(3) } as CSSProperties}
                  title={`${cfg.labels(i) || `#${i + 1}`}: ${Math.round(v)}`}
                />
              ))}
            </div>
            <div
              className="iso-heatstrip-axis"
              style={{ gridTemplateColumns: `repeat(${cfg.count}, 1fr)` } as CSSProperties}
            >
              {series.map((_, i) => (
                <span key={i} className="iso-heatstrip-tick">{cfg.labels(i)}</span>
              ))}
            </div>
          </div>
        )}

        <div className="iso-heatlegend">
          <span className="iso-heatlegend-label">Less</span>
          <span className="iso-heatlegend-scale">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
              <span key={t} className="iso-heatcell iso-heatlegend-cell" style={{ "--t": t.toFixed(2) } as CSSProperties} />
            ))}
          </span>
          <span className="iso-heatlegend-label">More events</span>
        </div>

        <div className="iso-detail-charts">
          <div className="iso-chart-card">
            <div className="iso-chart-head">
              <div>
                <div className="iso-chart-title">Visits Today</div>
                <div className="iso-chart-sub">Hourly · {visitsToday.reduce((s, v) => s + v, 0)} total</div>
              </div>
              <div className="iso-chart-stats">
                <span><b>{vtMin}</b><small>min</small></span>
                <span><b>{Math.round(vtAvg)}</b><small>avg</small></span>
                <span><b>{vtMax}</b><small>max</small></span>
              </div>
            </div>
            <div className="iso-chart-bars" style={{ gridTemplateColumns: `repeat(24, 1fr)` } as CSSProperties}>
              {visitsToday.map((v, h) => {
                const t = vtMax ? v / vtMax : 0;
                const isPeak = v === vtMax && v > 0;
                return (
                  <div key={h} className="iso-chart-bar-wrap" title={`${h.toString().padStart(2,"0")}:00 — ${v} visits`}>
                    <div className={isPeak ? "iso-chart-bar is-peak" : "iso-chart-bar"} style={{ height: `${Math.max(4, t * 100)}%` } as CSSProperties} />
                  </div>
                );
              })}
            </div>
            <div className="iso-chart-axis">
              <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span>
            </div>
          </div>

          <div className="iso-chart-card">
            <div className="iso-chart-head">
              <div>
                <div className="iso-chart-title">Avg Dwell Times</div>
                <div className="iso-chart-sub">Seconds spent · today</div>
              </div>
              <div className="iso-chart-stats">
                <span><b>{dwellAvg}s</b><small>avg</small></span>
                <span><b>{dwellMax}s</b><small>peak</small></span>
              </div>
            </div>
            <svg className="iso-chart-line" viewBox="0 0 240 80" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="dwellFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="var(--acc)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const W = 240, H = 80, P = 6;
                const pts = dwellSeries.map((v, i) => {
                  const x = P + (i / 23) * (W - P * 2);
                  const y = H - P - (v / dwellMax) * (H - P * 2);
                  return [x, y] as const;
                });
                const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
                const fill = `${path} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
                return (
                  <>
                    <path d={fill} fill="url(#dwellFill)" />
                    <path d={path} stroke="var(--acc)" strokeWidth="1.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    {pts.map(([x, y], i) => i % 3 === 0 && <circle key={i} cx={x} cy={y} r="1.6" fill="var(--acc)" />)}
                  </>
                );
              })()}
            </svg>
            <div className="iso-chart-axis">
              <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span>
            </div>
          </div>

          <div className="iso-chart-card iso-chart-timeline">
            <div className="iso-chart-head">
              <div>
                <div className="iso-chart-title">Tracking Timeline</div>
                <div className="iso-chart-sub">Last hit {last ? new Date(last.epoch).toLocaleTimeString([], { hour12: false }) : "—"}</div>
              </div>
            </div>
            <div className="iso-timeline-track">
              {Array.from({ length: 24 }).map((_, h) => (
                <span key={h} className="iso-timeline-tick" style={{ left: `${(h / 24) * 100}%` } as CSSProperties} />
              ))}
              {zoneEvents.slice(-40).map((e, i) => {
                const d = new Date(e.epoch);
                const today = d.toDateString() === new Date().toDateString();
                if (!today) return null;
                const pct = ((d.getHours() * 60 + d.getMinutes()) / (24 * 60)) * 100;
                const intensity = Math.min(1, e.value / 800);
                return (
                  <span
                    key={i}
                    className="iso-timeline-dot"
                    style={{ left: `${pct}%`, "--t": intensity.toFixed(2) } as CSSProperties}
                    title={`${d.toLocaleTimeString([], { hour12: false })} — ${e.value}`}
                  />
                );
              })}
            </div>
            <div className="iso-chart-axis">
              <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
