import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth";
import { LogoMark } from "@/components/LogoMark";

type Mode = "login" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode: Mode } => ({
    mode: s.mode === "signup" ? "signup" : "login",
  }),
  head: () => ({
    meta: [{ title: "Sign in — Piezolytics" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        setInfo("Check your email to confirm your account, then log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <header className="h-[58px] flex items-center px-6">
        <Link to="/" className="flex items-center gap-2.5 select-none">
          <LogoMark size={24} />
          <span className="font-display text-text" style={{ fontSize: 16, fontWeight: 600, letterSpacing: 0.2 }}>
            Piezolytics
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="panel w-full max-w-[420px] p-8">
          <div className="text-[11px] uppercase tracking-[0.22em] text-text3 mb-2">
            {isSignup ? "Get started" : "Welcome back"}
          </div>
          <h1 className="font-display mb-1" style={{ fontSize: 28, fontWeight: 600 }}>
            {isSignup ? "Create your account" : "Log in"}
          </h1>
          <p className="text-text3 text-[13px] mb-6">
            {isSignup ? "Spin up your live floor dashboard." : "Open your floor dashboard."}
          </p>

          <form onSubmit={submit} className="flex flex-col gap-3">
            {isSignup && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-text3">Full Name</span>
                <input
                  type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="px-3 py-2.5 rounded-lg text-sm"
                  style={{ background: "var(--surf2)", border: "1px solid var(--bord2)", color: "var(--text)" }}
                  autoComplete="name"
                  placeholder="Jane Doe"
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-text3">Email</span>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surf2)", border: "1px solid var(--bord2)", color: "var(--text)" }}
                autoComplete="email"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-text3">Password</span>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surf2)", border: "1px solid var(--bord2)", color: "var(--text)" }}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </label>

            {error && (
              <div className="text-[12px] px-3 py-2 rounded-md" style={{ background: "rgba(220,80,60,0.12)", color: "#ff9a8a", border: "1px solid rgba(220,80,60,0.3)" }}>
                {error}
              </div>
            )}
            {info && (
              <div className="text-[12px] px-3 py-2 rounded-md" style={{ background: "rgba(200,168,118,0.12)", color: "var(--acc)", border: "1px solid rgba(200,168,118,0.3)" }}>
                {info}
              </div>
            )}

            <button
              type="submit" disabled={busy}
              className="mt-2 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--acc)", color: "#1a1410" }}
            >
              {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
            </button>
          </form>

          <div className="mt-5 text-center text-[12px] text-text3">
            {isSignup ? (
              <>Already have an account?{" "}
                <Link to="/auth" search={{ mode: "login" }} className="text-text underline">Log in</Link>
              </>
            ) : (
              <>New to Piezolytics?{" "}
                <Link to="/auth" search={{ mode: "signup" }} className="text-text underline">Create an account</Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
