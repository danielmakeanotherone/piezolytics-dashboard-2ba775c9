import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { DemoTileManager, DemoHistory, DemoHeatMap, DemoOutline } from "@/components/DemoSections";
import { LogoMark } from "@/components/LogoMark";

type DemoTab = "dashboard" | "zones" | "outline" | "heatmap" | "history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Piezolytics — Real-time floor traffic analytics" },
      { name: "description", content: "Live piezo floor sensor analytics with isometric heatmap. Sign in to view your dashboard." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [demoTab, setDemoTab] = useState<DemoTab>("dashboard");
  return (
    <div className="min-h-screen bg-bg text-text">
      <header
        className="sticky top-0 z-40 h-[58px] flex items-center px-6 gap-6 backdrop-blur"
        style={{ background: "rgba(30,26,21,0.85)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <Link to="/" className="flex items-center gap-2.5 select-none">
          <LogoMark size={24} />
          <span className="font-display text-text" style={{ fontSize: 16, fontWeight: 600, letterSpacing: 0.2 }}>
            Piezolytics
          </span>
          <span className="ml-2 text-[10px] uppercase tracking-widest text-text3" style={{ border: "1px solid var(--bord2)", padding: "2px 6px", borderRadius: 4 }}>
            Live demo
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="px-3.5 py-1.5 rounded-lg text-sm text-text2 hover:text-text hover:bg-surf2 transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: "var(--acc)", color: "#1a1410" }}
          >
            Sign up
          </Link>
        </div>
      </header>

      <section
        className="relative max-w-[1400px] mx-auto px-6 text-center flex flex-col items-center"
        style={{ minHeight: "calc(100vh - 58px)", paddingTop: "18vh" }}
      >
        <div className="text-[11px] uppercase tracking-[0.22em] text-text3 mb-3">
          Public preview · simulated stream
        </div>
        <h1
          className="font-display"
          style={{ fontSize: 64, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1.05 }}
        >
          See your floor come alive.
        </h1>
        <p className="text-[11px] uppercase tracking-[0.22em] text-text3 mt-4">
          Turning Footsteps into Real Data
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: "var(--acc)", color: "#1a1410" }}
          >
            Create your dashboard
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="px-5 py-2.5 rounded-lg text-sm"
            style={{ border: "1px solid var(--bord2)", color: "var(--text2)" }}
          >
            Go to Dashboard
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text3 hover:text-text2 transition-colors bg-transparent border-0 cursor-pointer"
          style={{ bottom: 64 }}
        >
          <span className="text-[11px] uppercase tracking-[0.22em]">Scroll down for demo</span>
          <span style={{ fontSize: 18, animation: "bounce 1.8s ease-in-out infinite" }}>↓</span>
        </button>
      </section>

      {/* Demo dashboard preview (random data) */}
      <div id="demo" style={{ scrollMarginTop: 58 }}>
        <div className="max-w-[1400px] mx-auto px-6 pt-8">
          <div
            className="flex items-center gap-1 p-1 rounded-xl w-fit"
            style={{ background: "var(--surf2)", border: "1px solid var(--bord2)" }}
          >
            {(
              [
                { id: "dashboard", label: "Dashboard" },
                { id: "zones", label: "Tile Manager" },
                { id: "outline", label: "Outline Builder" },
                { id: "heatmap", label: "Heat Map" },
                { id: "history", label: "Entries" },
              ] as { id: DemoTab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setDemoTab(t.id)}
                className="px-3.5 py-1.5 rounded-lg text-sm transition-colors"
                style={{
                  background: demoTab === t.id ? "var(--surf3)" : "transparent",
                  color: demoTab === t.id ? "var(--text)" : "var(--text2)",
                }}
              >
                {t.label}
              </button>
            ))}
            <span className="ml-2 mr-2 text-[10px] uppercase tracking-[0.18em] text-text3">
              Preview
            </span>
          </div>
        </div>
        {demoTab === "dashboard" && <Dashboard demo hideNav />}
        {demoTab === "zones" && <DemoTileManager />}
        {demoTab === "outline" && <DemoOutline />}
        {demoTab === "heatmap" && <DemoHeatMap />}
        {demoTab === "history" && <DemoHistory />}
      </div>

      <section className="max-w-[1400px] mx-auto px-6 py-24 text-center flex flex-col items-center">
        <h2
          className="font-display"
          style={{ fontSize: 56, fontWeight: 600, letterSpacing: -0.6, lineHeight: 1.05 }}
        >
          Ready For Your Own? <span style={{ color: "var(--acc)" }}>Let's Start!</span>
        </h2>
        <p className="text-[11px] uppercase tracking-[0.22em] text-text3 mt-4">
          Your floor, your data, in minutes
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: "var(--acc)", color: "#1a1410" }}
          >
            Create your dashboard
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="px-5 py-2.5 rounded-lg text-sm"
            style={{ border: "1px solid var(--bord2)", color: "var(--text2)" }}
          >
            Go to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
