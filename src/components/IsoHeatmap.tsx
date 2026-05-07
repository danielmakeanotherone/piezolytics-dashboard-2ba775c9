import { ZONE_ORDER, type Stats } from "@/lib/floor-data";
import type { CSSProperties } from "react";

interface Props {
  stats: Stats;
}

// Anchor positions (percent of stage) for the callout label end-points.
// Tuned to sit just outside each isometric tile.
const CALLOUTS: Array<{
  // tile index in ZONE_ORDER
  i: number;
  // line start (on/near the tile top) in % of stage
  sx: number;
  sy: number;
  // line end (label position) in % of stage
  ex: number;
  ey: number;
  side: "left" | "right";
}> = [
  // Tile 01 — entrance (top-left of grid -> renders top of diamond)
  { i: 0, sx: 50, sy: 18, ex: 18, ey: 8, side: "left" },
  // Tile 02 — aisle_a (right of diamond)
  { i: 1, sx: 72, sy: 38, ex: 92, ey: 22, side: "right" },
  // Tile 03 — checkout (left of diamond)
  { i: 2, sx: 28, sy: 60, ex: 8, ey: 78, side: "left" },
  // Tile 04 — aisle_b (bottom of diamond)
  { i: 3, sx: 50, sy: 80, ex: 86, ey: 90, side: "right" },
];

export function IsoHeatmap({ stats }: Props) {
  const maxCount = Math.max(1, stats.maxCount);

  return (
    <div className="iso-stage" aria-label="Floor traffic heatmap">
      <div className="iso-grid">
        {ZONE_ORDER.map((zone, index) => {
          const count = stats.counts[zone];
          const norm = count / maxCount;
          const height = 34 + norm * 104;
          return (
            <div
              key={zone}
              className="iso-block"
              style={
                {
                  "--h": `${height}px`,
                  "--heat": norm.toFixed(3),
                  "--delay": `${index * 80}ms`,
                } as CSSProperties
              }
            >
              <div className="iso-column" aria-hidden="true">
                <div className="iso-top" />
                <div className="iso-left" />
                <div className="iso-right" />
                <div className="iso-piezos">
                  {Array.from({ length: 16 }).map((_, p) => (
                    <div key={p} className="piezo">
                      <span className="piezo-disc">
                        <span className="piezo-dot" />
                      </span>
                    </div>
                  ))}
                  <svg className="piezo-loom" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {(() => {
                      // Serpentine path through 8x2 grid (row 0 L→R, then row 1 R→L)
                      const cols = 8, rows = 2;
                      const pts: Array<[number, number]> = [];
                      for (let r = 0; r < rows; r++) {
                        for (let i = 0; i < cols; i++) {
                          const c = r % 2 === 0 ? i : cols - 1 - i;
                          pts.push([((c + 0.5) / cols) * 100, ((r + 0.5) / rows) * 100]);
                        }
                      }
                      const buildPath = (offset: number, arc: number) => {
                        let d = `M${pts[0][0].toFixed(2)},${(pts[0][1] + offset).toFixed(2)}`;
                        for (let i = 1; i < pts.length; i++) {
                          const [x0, y0] = pts[i - 1];
                          const [x1, y1] = pts[i];
                          const sameRow = Math.abs(y0 - y1) < 0.01;
                          if (sameRow) {
                            // arc upward between two adjacent discs in same row
                            const mx = (x0 + x1) / 2;
                            const cy = (y0 + offset) - arc;
                            d += ` Q${mx.toFixed(2)},${cy.toFixed(2)} ${x1.toFixed(2)},${(y1 + offset).toFixed(2)}`;
                          } else {
                            // row jump on the far side (turnaround loop)
                            const cx = x0 > 50 ? x0 + arc * 1.4 : x0 - arc * 1.4;
                            const cy = (y0 + y1) / 2 + offset;
                            d += ` Q${cx.toFixed(2)},${cy.toFixed(2)} ${x1.toFixed(2)},${(y1 + offset).toFixed(2)}`;
                          }
                        }
                        return d;
                      };
                      return (
                        <>
                          <path d={buildPath(-3, 22)} className="loom-wire loom-red" />
                          <path d={buildPath(3, 22)} className="loom-wire loom-black" />
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Callout overlay */}
      <svg className="iso-callouts" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {CALLOUTS.map((c) => {
          const midX = c.side === "left" ? c.ex + 6 : c.ex - 6;
          return (
            <g key={c.i}>
              <polyline
                points={`${c.sx},${c.sy} ${midX},${c.ey} ${c.ex},${c.ey}`}
                fill="none"
                stroke="var(--acc)"
                strokeOpacity="0.55"
                strokeWidth="0.18"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={c.sx} cy={c.sy} r="0.5" fill="var(--acc)" vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
      </svg>

      {CALLOUTS.map((c) => {
        const zone = ZONE_ORDER[c.i];
        const count = stats.counts[zone];
        const num = String(c.i + 1).padStart(2, "0");
        return (
          <div
            key={c.i}
            className="iso-tag"
            data-side={c.side}
            style={{
              left: `${c.ex}%`,
              top: `${c.ey}%`,
            }}
          >
            <span className="iso-tag-label">Tile # {num}</span>
            <span className="iso-tag-count">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
