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

      <section className="max-w-[1400px] mx-auto px-6 pt-10 pb-6 text-center">
        <div className="text-[11px] uppercase tracking-[0.22em] text-text3 mb-3">Public preview · simulated stream</div>
        <h1 className="font-display" style={{ fontSize: 44, fontWeight: 600, letterSpacing: -0.5 }}>
          See your floor come alive.
        </h1>
        <p className="text-text2 mt-3 max-w-2xl mx-auto" style={{ fontSize: 15 }}>
          A glimpse of the Piezolytics dashboard with random demo data.
          Sign up to connect your ESP32 and watch your real tiles light up.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
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
            I already have an account
          </Link>
        </div>
      </section>

      {/* Demo dashboard preview (random data) */}
      <Dashboard demo hideNav />
    </div>
  );
}
