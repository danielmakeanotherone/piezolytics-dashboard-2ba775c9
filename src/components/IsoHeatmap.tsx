import { ZONE_ORDER, type Stats } from "@/lib/floor-data";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

interface Props {
  stats: Stats;
}

interface Anchor {
  x: number;
  y: number;
  side: "top" | "bottom";
  index: number;
}

const LINE_LENGTH = 56; // uniform line length for every callout

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

      // Compute tile centers in stage coordinates
      const centers = tileRefs.current.map((el, i) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - sRect.left, y: r.top + r.height / 2 - sRect.top, i };
      }).filter(Boolean) as Array<{ x: number; y: number; i: number }>;

      if (centers.length === 0) return;

      // bbox of cluster
      const minY = Math.min(...centers.map(c => c.y));
      const maxY = Math.max(...centers.map(c => c.y));
      const midY = (minY + maxY) / 2;

      // Top half tiles -> top callouts; bottom half -> bottom callouts
      const next: Anchor[] = centers.map(c => {
        const side: "top" | "bottom" = c.y < midY ? "top" : "bottom";
        return { x: c.x, y: c.y, side, index: c.i };
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
