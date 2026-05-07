import { createFileRoute, Link } from "@tanstack/react-router";
import { Dashboard } from "@/components/Dashboard";
import { LogoMark } from "@/components/LogoMark";

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
        className="max-w-[1400px] mx-auto px-6 text-center flex flex-col items-center justify-center"
        style={{ minHeight: "calc(100vh - 58px)" }}
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
        <p className="text-text3 text-sm mt-3 max-w-2xl mx-auto">
          Turning Footsteps into Real Data.
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
            to="/dashboard"
            className="px-5 py-2.5 rounded-lg text-sm"
            style={{ border: "1px solid var(--bord2)", color: "var(--text2)" }}
          >
            Go to Dashboard
          </Link>
        </div>
        <a
          href="#demo"
          className="mt-16 flex flex-col items-center gap-2 text-text3 hover:text-text2 transition-colors"
        >
          <span className="text-[11px] uppercase tracking-[0.22em]">Scroll down for demo</span>
          <span style={{ fontSize: 18, animation: "bounce 1.8s ease-in-out infinite" }}>↓</span>
        </a>
      </section>

      {/* Demo dashboard preview (random data) */}
      <div id="demo" style={{ scrollMarginTop: 58 }}>
        <Dashboard demo hideNav />
      </div>
    </div>
  );
}
