import { ZONE_ORDER, ZONE_LABELS, type Stats, type SensorKey, type FloorEvent } from "@/lib/floor-data";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

interface Props {
  stats: Stats;
  events?: FloorEvent[];
}

export function IsoHeatmap({ stats, events = [] }: Props) {
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
    <div className="iso-stage" ref={stageRef} aria-label="Floor traffic heatmap">
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
    </div>
  );
}
