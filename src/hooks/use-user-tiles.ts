import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserTile {
  id: string;
  tile_number: number;
  label: string | null;
  created_at: string;
}

export function useUserTiles() {
  const [tiles, setTiles] = useState<UserTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_tiles")
      .select("id, tile_number, label, created_at")
      .order("tile_number", { ascending: true });
    if (error) setError(error.message);
    else {
      setTiles(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTile = useCallback(async (tileNumber: number, label: string) => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) throw new Error("Not signed in");
    const { error } = await supabase
      .from("user_tiles")
      .insert({ tile_number: tileNumber, label, user_id: uid });
    if (error) throw error;
    await load();
  }, [load]);

  const removeTile = useCallback(async (id: string) => {
    const { error } = await supabase.from("user_tiles").delete().eq("id", id);
    if (error) throw error;
    await load();
  }, [load]);

  return { tiles, loading, error, addTile, removeTile, refresh: load };
}
