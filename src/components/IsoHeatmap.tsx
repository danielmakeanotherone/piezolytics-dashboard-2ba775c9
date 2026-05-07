import { ZONE_ORDER, type Stats } from "@/lib/floor-data";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

interface Props {
  stats: Stats;
}

type CalloutLayout = {
  i: number;
  dotX: number;
  dotY: number;
  lineX: number;
  lineY: number;
  tagX: number;
  tagY: number;
  side: "left" | "right";
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function IsoHeatmap({ stats }: Props) {
  const maxCount = Math.max(1, stats.maxCount);
  const stageRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [callouts, setCallouts] = useState<CalloutLayout[]>([]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateCallouts = () => {
      const stageRect = stage.getBoundingClientRect();
      const tiles = ZONE_ORDER.map((_, i) => {
        const el = blockRefs.current[i];
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const left = rect.left - stageRect.left;
        const top = rect.top - stageRect.top;
        return {
          i,
          left,
          top,
          right: rect.right - stageRect.left,
          bottom: rect.bottom - stageRect.top,
          width: rect.width,
          height: rect.height,
          cx: left + rect.width / 2,
          cy: top + rect.height / 2,
        };
      }).filter((tile): tile is NonNullable<typeof tile> => tile !== null);

      if (tiles.length !== ZONE_ORDER.length) return;

      const topTile = [...tiles].sort((a, b) => a.cy - b.cy)[0];
      const bottomTile = [...tiles].sort((a, b) => b.cy - a.cy)[0];
      const leftTile = [...tiles].sort((a, b) => a.cx - b.cx)[0];
      const rightTile = [...tiles].sort((a, b) => b.cx - a.cx)[0];
      const placement = new Map<number, "top" | "bottom" | "left" | "right">([
        [topTile.i, "top"],
        [bottomTile.i, "bottom"],
        [leftTile.i, "left"],
        [rightTile.i, "right"],
      ]);

      const margin = 22;
      const lineLength = 46;
      const tagWidth = 124;
      const tagHeight = 34;
      const tagGap = 18;
      const lineAngle = 30 * (Math.PI / 180);
      const lineDx = Math.cos(lineAngle) * lineLength;
      const lineDy = Math.sin(lineAngle) * lineLength;
      const gutter = 12;

      // Bounding box of all tiles, so callouts always sit outside the cluster.
      const bbox = tiles.reduce(
        (acc, t) => ({
          left: Math.min(acc.left, t.left),
          right: Math.max(acc.right, t.right),
          top: Math.min(acc.top, t.top),
          bottom: Math.max(acc.bottom, t.bottom),
        }),
        { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity },
      );

      const centerX = (bbox.left + bbox.right) / 2;
      const topTagY = Math.max(gutter + tagHeight / 2, bbox.top - tagGap - tagHeight / 2);
      const bottomTagY = Math.min(stageRect.height - gutter - tagHeight / 2, bbox.bottom + tagGap + tagHeight / 2);

      const makeTopCallout = (tile: (typeof tiles)[number]): CalloutLayout => {
        const toLeft = tile.cx < centerX;
        const tagY = topTagY;
        if (toLeft) {
          const tagX = clamp(tile.cx - 20, gutter + tagWidth, stageRect.width - gutter);
          return { i: tile.i, dotX: tagX - lineDx, dotY: tagY - lineDy, lineX: tagX, lineY: tagY, tagX, tagY, side: "right" };
        }
        const tagX = clamp(tile.cx + 20, gutter, stageRect.width - gutter - tagWidth);
        return { i: tile.i, dotX: tagX + tagWidth + lineDx, dotY: tagY - lineDy, lineX: tagX + tagWidth, lineY: tagY, tagX, tagY, side: "left" };
      };

      const next = tiles.map((tile) => {
        const where = placement.get(tile.i) ?? "left";

        if (where === "top") {
          return makeTopCallout(tile);
        } else if (where === "bottom") {
          const tagY = bottomTagY;
          if (tagY - tagHeight / 2 <= bbox.bottom + tagGap / 2) return makeTopCallout(tile);
          const toLeft = tile.cx < centerX;
          if (toLeft) {
            const tagX = clamp(tile.cx - 18, gutter + tagWidth, stageRect.width - gutter);
            return { i: tile.i, dotX: tagX - lineDx, dotY: tagY + lineDy, lineX: tagX, lineY: tagY, tagX, tagY, side: "right" };
          }
          const tagX = clamp(tile.cx + 18, gutter, stageRect.width - gutter - tagWidth);
          return { i: tile.i, dotX: tagX + tagWidth + lineDx, dotY: tagY + lineDy, lineX: tagX + tagWidth, lineY: tagY, tagX, tagY, side: "left" };
        } else if (where === "right") {
          const tagX = bbox.right + tagGap;
          if (tagX + tagWidth + lineLength + margin > stageRect.width - gutter) return makeTopCallout(tile);
          const tagY = clamp(tile.cy, gutter + tagHeight / 2, stageRect.height - gutter - tagHeight / 2);
          return { i: tile.i, dotX: tagX + tagWidth + lineLength, dotY: tagY, lineX: tagX + tagWidth, lineY: tagY, tagX, tagY, side: "left" };
        }

        const tagX = bbox.left - tagGap - tagWidth;
        if (tagX - lineLength - margin < gutter) return makeTopCallout(tile);
        const tagY = clamp(tile.cy, gutter + tagHeight / 2, stageRect.height - gutter - tagHeight / 2);
        return { i: tile.i, dotX: tagX - lineLength, dotY: tagY, lineX: tagX, lineY: tagY, tagX, tagY, side: "left" };
      });

      setCallouts(next);
    };

    const frame = window.requestAnimationFrame(updateCallouts);
    const timer = window.setTimeout(updateCallouts, 250);
    window.addEventListener("resize", updateCallouts);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateCallouts) : null;
    observer?.observe(stage);
    blockRefs.current.forEach((block) => block && observer?.observe(block));

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateCallouts);
      observer?.disconnect();
    };
  }, [maxCount]);

  return (
    <div ref={stageRef} className="iso-stage" aria-label="Floor traffic heatmap">
      <div className="iso-grid">
        {ZONE_ORDER.map((zone, index) => {
          const count = stats.counts[zone];
          const norm = count / maxCount;
          const height = 34 + norm * 104;
          return (
            <div
              key={zone}
              ref={(el) => {
                blockRefs.current[index] = el;
              }}
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
                      // Separate short arcs by row only. No end-to-end turnarounds or outer edge loops.
                      const cols = 8, rows = 4;
                      // Both wires run along the bottom of each row. Each wire has a short
                      // horizontal contact segment on every piezo, then arcs down between piezos.
                      const buildPath = (laneOffset: number) => {
                        const touchY = 4.2;   // contact line distance below row center (on disc edge)
                        const arcDrop = 2.2;  // how far the loop dips below the contact line
                        const contactHalf = 2.2; // half-width of the contact segment on each piezo
                        let d = "";
                        for (let r = 0; r < rows; r++) {
                          const yCenter = ((r + 0.5) / rows) * 100;
                          const yTouch = yCenter + touchY + laneOffset;
                          for (let c = 0; c < cols; c++) {
                            const xc = ((c + 0.5) / cols) * 100;
                            const xL = xc - contactHalf;
                            const xR = xc + contactHalf;
                            // contact segment on this piezo
                            d += `M${xL.toFixed(2)},${yTouch.toFixed(2)} L${xR.toFixed(2)},${yTouch.toFixed(2)} `;
                            // arc to next piezo's left contact
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

      <svg className="iso-callouts" aria-hidden="true">
        {callouts.map((c) => {
          return (
            <g key={c.i}>
              <polyline
                points={`${c.lineX},${c.lineY} ${c.dotX},${c.dotY}`}
                fill="none"
                stroke="var(--acc)"
                strokeOpacity="0.55"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={c.dotX} cy={c.dotY} r="3.5" fill="var(--acc)" />
            </g>
          );
        })}
      </svg>

      {callouts.map((c) => {
        const zone = ZONE_ORDER[c.i];
        const count = stats.counts[zone];
        const num = String(c.i + 1).padStart(2, "0");
        return (
          <div
            key={c.i}
            className="iso-tag"
            data-side={c.side}
            style={{
              left: `${c.tagX}px`,
              top: `${c.tagY}px`,
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
