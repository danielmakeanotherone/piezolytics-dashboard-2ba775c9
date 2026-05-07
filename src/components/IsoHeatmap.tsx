import { ZONE_ORDER, type Stats } from "@/lib/floor-data";
import { type CSSProperties } from "react";

interface Props {
  stats: Stats;
}

export function IsoHeatmap({ stats }: Props) {
  const maxCount = Math.max(1, stats.maxCount);

  return (
    <div className="iso-stage" aria-label="Floor traffic heatmap">
      <div className="iso-callout-strip" aria-hidden="true">
        {ZONE_ORDER.map((zone, index) => (
          <div key={zone} className="iso-tag iso-tag-static">
            <span className="iso-tag-label">Tile # {String(index + 1).padStart(2, "0")}</span>
            <span className="iso-tag-count">{stats.counts[zone]}</span>
          </div>
        ))}
      </div>
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
    </div>
  );
}
