import { ZONE_ORDER, type Stats } from "@/lib/floor-data";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

interface Props {
  stats: Stats;
}

interface Anchor {
  sx: number;
  sy: number;
  dx: number;
  dy: number;
  dir: "up" | "down" | "left" | "right";
  index: number;
}

const LEADER_LEN = 48; // uniform leader length for every tile

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
        };
      }).filter(Boolean) as Array<{ i: number; cx: number; cy: number }>;

      if (tiles.length === 0) return;

      // In the iso-rotated 2x2 grid, tiles form a diamond. Find the
      // extreme tile in each axial direction so each gets a unique side.
      const top = tiles.reduce((a, b) => (b.cy < a.cy ? b : a));
      const bottom = tiles.reduce((a, b) => (b.cy > a.cy ? b : a));
      const left = tiles.reduce((a, b) => (b.cx < a.cx ? b : a));
      const right = tiles.reduce((a, b) => (b.cx > a.cx ? b : a));

      const dirByIndex = new Map<number, Anchor["dir"]>();
      dirByIndex.set(top.i, "up");
      dirByIndex.set(bottom.i, "down");
      // left/right may collide with top/bottom if not yet assigned
      if (!dirByIndex.has(left.i)) dirByIndex.set(left.i, "left");
      if (!dirByIndex.has(right.i)) dirByIndex.set(right.i, "right");
      // Fallback: assign remaining tiles by exclusion
      const remainingDirs: Anchor["dir"][] = (["up", "down", "left", "right"] as const)
        .filter(d => ![...dirByIndex.values()].includes(d));
      tiles.forEach(t => {
        if (!dirByIndex.has(t.i)) dirByIndex.set(t.i, remainingDirs.shift() || "up");
      });

      const next: Anchor[] = tiles.map(t => {
        const dir = dirByIndex.get(t.i)!;
        const tileHalf = 70; // approx half-size of tile bbox in stage coords
        let sx = t.cx, sy = t.cy, dx = t.cx, dy = t.cy;
        if (dir === "up")    { sy = t.cy - tileHalf; dy = sy - LEADER_LEN; }
        if (dir === "down")  { sy = t.cy + tileHalf; dy = sy + LEADER_LEN; }
        if (dir === "left")  { sx = t.cx - tileHalf; dx = sx - LEADER_LEN; }
        if (dir === "right") { sx = t.cx + tileHalf; dx = sx + LEADER_LEN; }
        return { sx, sy, dx, dy, dir, index: t.i };
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
        {anchors.map((a) => (
          <g key={a.index} className="iso-leader">
            <line x1={a.sx} y1={a.sy} x2={a.dx} y2={a.dy} />
            <circle cx={a.dx} cy={a.dy} r={4} />
          </g>
        ))}
      </svg>

      {anchors.map((a) => {
        const labelLeft = a.dx < a.sx; // dot is to the left of tile -> label further left
        return (
          <div
            key={a.index}
            className="iso-tag iso-tag-leader"
            style={{
              left: a.dx,
              top: a.dy,
              transform: `translate(${labelLeft ? "calc(-100% - 10px)" : "10px"}, -50%)`,
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
