import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth";
import type { Tile } from "@/lib/floor-data";

export function useTiles() {
  const { session, loading: authLoading } = useAuthSession();
  const userId = session?.user?.id ?? null;
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_tiles")
      .select("id, tile_number, label")
      .order("tile_number", { ascending: true });
    if (error) setError(error.message);
    else {
      setTiles((data ?? []).map((r) => ({ id: r.id, number: r.tile_number, label: r.label })));
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const addTile = useCallback(
    async (n: number, label?: string) => {
      if (!userId) return { error: "Not signed in" };
      const { error } = await supabase
        .from("user_tiles")
        .insert({ user_id: userId, tile_number: n, label: label ?? null });
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [userId, refresh],
  );

  const deleteTile = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("user_tiles").delete().eq("id", id);
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  return { tiles, loading: authLoading || loading, error, refresh, addTile, deleteTile };
}
