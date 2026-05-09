import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OutlineElement } from "@/components/OutlineBuilder";

export const DEFAULT_COLS = 24;
export const DEFAULT_ROWS = 16;

interface LayoutData {
  cols: number;
  rows: number;
  elements: OutlineElement[];
}

function parseLayout(raw: unknown): LayoutData {
  if (Array.isArray(raw)) {
    return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS, elements: raw as OutlineElement[] };
  }
  if (raw && typeof raw === "object") {
    const r = raw as { cols?: number; rows?: number; elements?: OutlineElement[] };
    return {
      cols: typeof r.cols === "number" ? r.cols : DEFAULT_COLS,
      rows: typeof r.rows === "number" ? r.rows : DEFAULT_ROWS,
      elements: Array.isArray(r.elements) ? r.elements : [],
    };
  }
  return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS, elements: [] };
}

export function useRoomLayout() {
  const [elements, setElements] = useState<OutlineElement[]>([]);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [hasSavedLayout, setHasSavedLayout] = useState(false);
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
      if (data) {
        const parsed = parseLayout(data.elements);
        setCols(parsed.cols);
        setRows(parsed.rows);
        setElements(parsed.elements);
        setHasSavedLayout(true);
      } else {
        setHasSavedLayout(false);
      }
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (els: OutlineElement[], c: number, r: number) => {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const payload: LayoutData = { cols: c, rows: r, elements: els };
      const { error } = await supabase
        .from("room_layouts")
        .upsert({ user_id: uid, elements: payload as never }, { onConflict: "user_id" });
      if (error) throw error;
      setHasSavedLayout(true);
    } finally {
      setSaving(false);
    }
  }, []);

  return { elements, setElements, cols, setCols, rows, setRows, hasSavedLayout, loading, saving, error, save, refresh: load };
}
