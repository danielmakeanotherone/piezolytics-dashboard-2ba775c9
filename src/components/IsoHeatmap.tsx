import { ZONE_LABELS, ZONE_ORDER, type Stats } from "@/lib/floor-data";
import type { CSSProperties } from "react";

interface Props {
  stats: Stats;
}

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
              </div>
              <div className="iso-label">
                <strong>{count}</strong>
                <span>{ZONE_LABELS[zone]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}