import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normTxt } from "@/utils/categories";

export interface CategoryRule {
  id: string;
  texto_contem: string;
  modo: string;
  tipo: string;
  categoria_origem: string | null;
  categoria: string;
  forma_pagamento: string | null;
  prioridade: number;
}

export function ruleMatches(r: CategoryRule, type: string, description: string, currentCategory?: string) {
  if (r.tipo !== type) return false;
  if (r.categoria_origem && r.categoria_origem !== currentCategory) return false;
  const d = normTxt(description);
  const t = normTxt(r.texto_contem);
  return r.modo === "igual" ? d.trim() === t.trim() : d.includes(t);
}

export function useCategoryRules() {
  const [rules, setRules] = useState<CategoryRule[]>([]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("regras_categoria").select("*").order("prioridade").order("created_at");
    setRules((data ?? []) as CategoryRule[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.from("regras_categoria").select("*").order("prioridade").order("created_at")
      .then(({ data }) => { if (!cancelled) setRules((data ?? []) as CategoryRule[]); });
    return () => { cancelled = true; };
  }, []);

  /** Primeira regra que casa (ignora regras que dependem da categoria de origem). */
  const findRule = useCallback((type: string, description: string) => {
    if (description.trim().length < 3) return null;
    return rules.find(r => !r.categoria_origem && ruleMatches(r, type, description)) ?? null;
  }, [rules]);

  return { rules, refresh, findRule };
}
