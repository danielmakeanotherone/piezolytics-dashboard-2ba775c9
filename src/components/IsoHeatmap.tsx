import { useEffect, useRef } from "react";
import { ZONE_GRID, ZONE_LABELS, ZONE_ORDER, type SensorKey, type Stats } from "@/lib/floor-data";

interface Props {
  stats: Stats;
}

const COPPER = { r: 200, g: 168, b: 118 };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function IsoHeatmap({ stats }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.floor(wrap.clientWidth));
    const H = Math.max(1, Math.floor(wrap.clientHeight));
    const pixelW = Math.floor(W * dpr);
    const pixelH = Math.floor(H * dpr);
    if (canvas.width !== pixelW) canvas.width = pixelW;
    if (canvas.height !== pixelH) canvas.height = pixelH;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const TW = Math.min(W * 0.18, 92);
    const TD = TW * 0.5;
    const ox = W / 2;
    const oy = H * 0.52;

    const EMIN = 14;
    const EMAX = Math.min(H * 0.3, 120);
    const maxCount = stats.maxCount || 1;

    // Ambient ground glow
    {
      const r = TW * 2.6;
      const g = ctx.createRadialGradient(ox, oy + TD, 0, ox, oy + TD, r);
      g.addColorStop(0, "rgba(200,160,80,0.05)");
      g.addColorStop(1, "rgba(200,160,80,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(ox, oy + TD, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Back-to-front draw order: (0,0), (1,0), (0,1), (1,1)
    const order: Array<{ col: 0 | 1; row: 0 | 1; key: SensorKey }> = [];
    for (const k of ZONE_ORDER) {
      const { col, row } = ZONE_GRID[k];
      order.push({ col, row, key: k });
    }
    order.sort((a, b) => a.row + a.col - (b.row + b.col));

    // Shadows first (all)
    for (const { col, row, key } of order) {
      const count = stats.counts[key];
      const norm = count / maxCount;
      const elev = EMIN + norm * (EMAX - EMIN);
      const gx = ox + (col - row) * TW;
      const gy = oy + (col + row) * TD;
      const shadowR = TW * (0.95 + norm * 0.15);
      const sg = ctx.createRadialGradient(gx, gy + TD * 0.3, 0, gx, gy + TD * 0.3, shadowR);
      sg.addColorStop(0, `rgba(0,0,0,${0.45 + norm * 0.2})`);
      sg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(gx, gy + TD * 0.3, shadowR, shadowR * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Hint of elevation - tiny extra shadow under floating block
      void elev;
    }

    // Blocks
    for (const { col, row, key } of order) {
      const count = stats.counts[key];
      const norm = maxCount > 0 ? count / maxCount : 0;
      const elev = EMIN + norm * (EMAX - EMIN);
      const gx = ox + (col - row) * TW;
      const gy = oy + (col + row) * TD;

      // Top corners
      const N: [number, number] = [gx, gy - elev - TD];
      const E: [number, number] = [gx + TW, gy - elev];
      const S: [number, number] = [gx, gy - elev + TD];
      const L: [number, number] = [gx - TW, gy - elev];

      // Ground corners
      const GS: [number, number] = [gx, gy + TD];
      const GE: [number, number] = [gx + TW, gy];
      const GL: [number, number] = [gx - TW, gy];

      // Left side
      {
        const lg = ctx.createLinearGradient(gx - TW * 0.5, S[1], gx - TW * 0.5, GS[1]);
        const r1 = Math.round(lerp(42, 70, norm));
        const g1 = Math.round(r1 * 0.78);
        const b1 = Math.round(r1 * 0.48);
        lg.addColorStop(0, `rgb(${r1},${g1},${b1})`);
        lg.addColorStop(1, "rgb(22,17,10)");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(L[0], L[1]);
        ctx.lineTo(S[0], S[1]);
        ctx.lineTo(GS[0], GS[1]);
        ctx.lineTo(GL[0], GL[1]);
        ctx.closePath();
        ctx.fill();
      }
      // Right side
      {
        const lg = ctx.createLinearGradient(gx + TW * 0.5, S[1], gx + TW * 0.5, GS[1]);
        const r1 = Math.round(lerp(30, 48, norm));
        const g1 = Math.round(r1 * 0.78);
        const b1 = Math.round(r1 * 0.48);
        lg.addColorStop(0, `rgb(${r1},${g1},${b1})`);
        lg.addColorStop(1, "rgb(18,14,8)");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(S[0], S[1]);
        ctx.lineTo(E[0], E[1]);
        ctx.lineTo(GE[0], GE[1]);
        ctx.lineTo(GS[0], GS[1]);
        ctx.closePath();
        ctx.fill();
      }
      // Top face
      {
        const cx = gx;
        const cy = gy - elev;
        const radius = Math.max(TW, TD) * 1.1;
        const cr = Math.round(lerp(50, COPPER.r, norm));
        const cg = Math.round(lerp(38, COPPER.g, norm));
        const cb = Math.round(lerp(22, COPPER.b, norm));
        const tg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        tg.addColorStop(0, `rgb(${cr},${cg},${cb})`);
        tg.addColorStop(1, "rgba(30,24,14,0.9)");
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(N[0], N[1]);
        ctx.lineTo(E[0], E[1]);
        ctx.lineTo(S[0], S[1]);
        ctx.lineTo(L[0], L[1]);
        ctx.closePath();
        ctx.fill();

        // Glow overlay
        if (norm > 0.25) {
          ctx.save();
          ctx.globalAlpha = norm * 0.22;
          const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.8);
          glow.addColorStop(0, "rgba(255,215,145,1)");
          glow.addColorStop(1, "rgba(255,215,145,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.moveTo(N[0], N[1]);
          ctx.lineTo(E[0], E[1]);
          ctx.lineTo(S[0], S[1]);
          ctx.lineTo(L[0], L[1]);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Top edge stroke
        ctx.strokeStyle = `rgba(220,185,130,${0.1 + norm * 0.38})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(N[0], N[1]);
        ctx.lineTo(E[0], E[1]);
        ctx.lineTo(S[0], S[1]);
        ctx.lineTo(L[0], L[1]);
        ctx.closePath();
        ctx.stroke();
      }

      // Labels
      const countSize = Math.min(TD * 0.95, TW * 0.52);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(255,245,225,${0.55 + norm * 0.45})`;
      ctx.font = `700 ${countSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(String(count), gx, gy - elev - 2);

      ctx.fillStyle = `rgba(200,168,118,${0.7 + norm * 0.3})`;
      ctx.font = `500 ${countSize * 0.5}px Inter, system-ui, sans-serif`;
      ctx.fillText(ZONE_LABELS[key], gx, gy - elev + TD * 0.36);
    }
  };

  useEffect(() => {
    const schedule = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.counts.entrance, stats.counts.aisle_a, stats.counts.checkout, stats.counts.aisle_b, stats.maxCount]);

  return (
    <div ref={wrapRef} className="w-full h-full" style={{ padding: 16, overflow: "hidden", minWidth: 0, minHeight: 0 }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
