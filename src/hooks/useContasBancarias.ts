import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ContaBancaria { id: string; nome: string; banco: string | null }

export function useContasBancarias() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  useEffect(() => {
    let cancelled = false;
    supabase.from("contas_bancarias").select("id,nome,banco").eq("ativo", true).order("created_at")
      .then(({ data }) => { if (!cancelled) setContas((data ?? []) as ContaBancaria[]); });
    return () => { cancelled = true; };
  }, []);
  return contas;
}
