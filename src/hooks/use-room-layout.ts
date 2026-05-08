import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OutlineElement } from "@/components/OutlineBuilder";

export function useRoomLayout() {
  const [elements, setElements] = useState<OutlineElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("room_layouts")
      .select("elements")
      .maybeSingle();
    if (error && error.code !== "PGRST116") setError(error.message);
    else {
      const els = (data?.elements ?? []) as unknown as OutlineElement[];
      setElements(Array.isArray(els) ? els : []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (els: OutlineElement[]) => {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase
        .from("room_layouts")
        .upsert({ user_id: uid, elements: els as never }, { onConflict: "user_id" });
      if (error) throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  return { elements, setElements, loading, saving, error, save, refresh: load };
}
