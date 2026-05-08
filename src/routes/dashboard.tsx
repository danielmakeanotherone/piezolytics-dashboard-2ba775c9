import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Dashboard } from "@/components/Dashboard";
import { useAuthSession } from "@/hooks/use-auth";
import { useTiles } from "@/hooks/use-tiles";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Piezolytics" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session, loading } = useAuthSession();
  const { tiles, loading: tilesLoading } = useTiles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", search: { mode: "login" } });
  }, [loading, session, navigate]);

  useEffect(() => {
    // If signed in but no tiles, send the user to Tile Manager
    if (!loading && session && !tilesLoading && tiles.length === 0) {
      navigate({ to: "/zones" });
    }
  }, [loading, session, tilesLoading, tiles.length, navigate]);

  if (loading || !session || tilesLoading) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <span className="text-text3 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <Dashboard
      tiles={tiles}
      onLogout={async () => {
        await supabase.auth.signOut();
        navigate({ to: "/" });
      }}
    />
  );
}
