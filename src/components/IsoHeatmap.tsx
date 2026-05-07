import { ZONE_ORDER, type Stats } from "@/lib/floor-data";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

interface Props {
  stats: Stats;
}

interface Anchor {
  // tile edge point where the line starts
  sx: number;
  sy: number;
  // dot/label point where the line ends
  dx: number;
  dy: number;
  side: "top" | "bottom";
  index: number;
}

const LEADER_LEN = 64; // uniform diagonal line length
const ANGLE = Math.PI / 4; // 45 degrees, consistent for all

export function IsoHeatmap({ stats }: Props) {
  const maxCount = Math.max(1, stats.maxCount);
  const stageRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const sRect = stage.getBoundingClientRect();
      setStageSize({ w: sRect.width, h: sRect.height });

      const tiles = tileRefs.current.map((el, i) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          i,
          cx: r.left + r.width / 2 - sRect.left,
          cy: r.top + r.height / 2 - sRect.top,
          left: r.left - sRect.left,
          right: r.right - sRect.left,
          top: r.top - sRect.top,
          bottom: r.bottom - sRect.top,
        };
      }).filter(Boolean) as Array<{ i: number; cx: number; cy: number; left: number; right: number; top: number; bottom: number }>;

      if (tiles.length === 0) return;

      const minY = Math.min(...tiles.map(t => t.cy));
      const maxY = Math.max(...tiles.map(t => t.cy));
      const midY = (minY + maxY) / 2;
      const midX = tiles.reduce((s, t) => s + t.cx, 0) / tiles.length;

      const next: Anchor[] = tiles.map(t => {
        const isTop = t.cy < midY;
        const isLeft = t.cx < midX;
        // Anchor at the outer corner of the tile (away from cluster center)
        const sx = isLeft ? t.left + 8 : t.right - 8;
        const sy = isTop ? t.top + 8 : t.bottom - 8;
        // Dot extends diagonally outward at 45°, uniform length
        const dirX = isLeft ? -1 : 1;
        const dirY = isTop ? -1 : 1;
        const dx = sx + dirX * Math.cos(ANGLE) * LEADER_LEN;
        const dy = sy + dirY * Math.sin(ANGLE) * LEADER_LEN;
        return {
          sx, sy, dx, dy,
          side: isTop ? "top" : "bottom",
          index: t.i,
        };
      });
      setAnchors(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    tileRefs.current.forEach(el => el && ro.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Compute uniform top/bottom strip Y positions based on cluster bbox
  const topY = anchors.length ? Math.min(...anchors.map(a => a.y)) - LINE_LENGTH : 0;
  const bottomY = anchors.length ? Math.max(...anchors.map(a => a.y)) + LINE_LENGTH : 0;

  return (
    <div className="iso-stage" ref={stageRef} aria-label="Floor traffic heatmap">
      <div className="iso-grid">
        {ZONE_ORDER.map((zone, index) => {
          const count = stats.counts[zone];
          const norm = count / maxCount;
          const height = 34 + norm * 104;
          return (
            <div
              key={zone}
              ref={(el) => { tileRefs.current[index] = el; }}
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Callout overlay: uniform leader lines + dots, never crossing tiles */}
      <svg
        className="iso-leader-svg"
        width={stageSize.w}
        height={stageSize.h}
        aria-hidden="true"
      >
        {anchors.map((a) => {
          const ly = a.side === "top" ? topY : bottomY;
          return (
            <g key={a.index} className="iso-leader">
              <line x1={a.x} y1={ly} x2={a.x} y2={a.side === "top" ? a.y - 8 : a.y + 8} />
              <circle cx={a.x} cy={ly} r={3.5} />
            </g>
          );
        })}
      </svg>

      {anchors.map((a) => {
        const ly = a.side === "top" ? topY : bottomY;
        return (
          <div
            key={a.index}
            className="iso-tag iso-tag-leader"
            data-side={a.side}
            style={{
              left: a.x,
              top: a.side === "top" ? ly - 14 : ly + 14,
            }}
          >
            <span className="iso-tag-label">Tile # {String(a.index + 1).padStart(2, "0")}</span>
            <span className="iso-tag-count">{stats.counts[ZONE_ORDER[a.index]]}</span>
          </div>
        );
      })}
    </div>
  );
}
