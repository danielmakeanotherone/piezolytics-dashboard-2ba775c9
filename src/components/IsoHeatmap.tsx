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
          Waiting for ESP32 connection…
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

      <div className="iso-hint">Click a tile to view analytics</div>

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

  // Heatmap grid: 7 rows (Mon..Sun) x 24 cols (hours). Synthesize a stable
  // distribution from the live counts so the grid is dense and readable
  // even when only the last few minutes of events are available.
  const COLS = 24;
  const ROWS = 7;
  const heat = useMemo(() => {
    const grid: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    // 1) project real events into their (dow, hour) cell
    for (const e of zoneEvents) {
      const d = new Date(e.epoch);
      const dow = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
      grid[dow][d.getHours()]++;
    }
    // 2) overlay a deterministic synthetic baseline so the chart looks lived-in
    const seed = (index + 1) * 991;
    const rand = (n: number) => {
      const x = Math.sin(seed + n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    const rangeBoost = { Day: 0.4, Week: 1, Month: 1.4, Quarter: 1.8, Year: 2.2, All: 2.6 }[range];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // working-hours bias (peaks 11-19), weekend dip
        const hourBias = Math.max(0, 1 - Math.abs(c - 14) / 10);
        const dowBias = r < 5 ? 1 : 0.55;
        const noise = rand(r * 31 + c);
        grid[r][c] += (count / 6) * hourBias * dowBias * (0.4 + noise * 0.9) * rangeBoost;
      }
    }
    return grid;
  }, [zoneEvents, count, range, index]);

  const flat = heat.flat();
  const minVal = Math.round(Math.min(...flat));
  const maxVal = Math.round(Math.max(...flat));
  const avgVal = Math.round(flat.reduce((s, v) => s + v, 0) / flat.length);
  const heatMax = Math.max(1, ...flat);

  const recent = zoneEvents.slice(-12).reverse();
  const last = zoneEvents.length ? zoneEvents[zoneEvents.length - 1] : null;

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
            <small>Minimal number</small>
          </div>
          <div>
            <div className="iso-bignum">{avgVal} <span className="iso-bignum-arrow">↗</span></div>
            <small>Average number</small>
          </div>
          <div>
            <div className="iso-bignum">{maxVal} <span className="iso-bignum-arrow">↗</span></div>
            <small>Maximum number</small>
          </div>
        </div>

        <div className="iso-heatgrid">
          <div className="iso-heatgrid-rows">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, r) => (
              <div key={d} className="iso-heatgrid-row">
                <span className="iso-heatgrid-label">{d}</span>
                <div className="iso-heatgrid-cells">
                  {heat[r].map((v, c) => {
                    const t = v / heatMax;
                    return <span key={c} className="iso-heatcell" style={{ "--t": t.toFixed(3) } as CSSProperties} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="iso-heatlegend">
          <span className="iso-heatlegend-label">Less</span>
          <span className="iso-heatlegend-scale">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
              <span key={t} className="iso-heatcell iso-heatlegend-cell" style={{ "--t": t.toFixed(2) } as CSSProperties} />
            ))}
          </span>
          <span className="iso-heatlegend-label">More events</span>
        </div>

        <div className="iso-detail-section">
          <div className="iso-detail-section-title">
            <span>Recent events</span>
            <span className="iso-detail-section-meta">last hit {last ? new Date(last.epoch).toLocaleTimeString([], { hour12: false }) : "—"}</span>
          </div>
          <ul className="iso-detail-events">
            {recent.length === 0 && <li className="iso-detail-empty">No recent events</li>}
            {recent.map((e, i) => (
              <li key={i}>
                <span className="time">{new Date(e.epoch).toLocaleTimeString([], { hour12: false })}</span>
                <span className="sig">{e.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
