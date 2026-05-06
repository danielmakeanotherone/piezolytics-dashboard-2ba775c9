import { useEffect, useRef } from "react";

export function Sparkline({ data, height = 44 }: { data: number[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const W = wrap.clientWidth;
    const H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const max = Math.max(1, ...data);
    const gap = 2;
    const bw = (W - gap * (data.length - 1)) / data.length;
    data.forEach((v, i) => {
      const norm = v / max;
      const bh = Math.max(2, norm * (H - 4));
      const x = i * (bw + gap);
      const y = H - bh;
      const grad = ctx.createLinearGradient(0, y, 0, H);
      grad.addColorStop(0, `rgba(200,168,118,${0.3 + norm * 0.7})`);
      grad.addColorStop(1, "rgba(200,168,118,0.08)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      const r = Math.min(2, bw / 2);
      ctx.roundRect(x, y, bw, bh, r);
      ctx.fill();
    });
  }, [data, height]);

  return (
    <div ref={wrapRef} style={{ width: "100%", height, overflow: "hidden" }}>
      <canvas ref={ref} style={{ display: "block" }} />
    </div>
  );
}
