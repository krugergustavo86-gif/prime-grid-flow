import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomCategory {
  id: string;
  name: string;
  type: "Entrada" | "Saída";
}

export function useCustomCategories() {
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("custom_categories")
      .select("id,name,type")
      .order("name", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setCategories((data ?? []) as CustomCategory[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  const addCategory = useCallback(async (name: string, type: "Entrada" | "Saída") => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("custom_categories")
      .insert({ name: trimmed, type, created_by: user?.id ?? null })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        toast.error("Categoria já existe");
      } else {
        console.error(error);
        toast.error("Erro ao criar categoria");
      }
      return null;
    }
    setCategories(prev => [...prev, data as CustomCategory].sort((a, b) => a.name.localeCompare(b.name)));
    toast.success("Categoria criada");
    return data as CustomCategory;
  }, []);

  return { categories, loading, addCategory, refresh };
}
