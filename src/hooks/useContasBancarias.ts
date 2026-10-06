import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ContaBancaria {
  id: string; nome: string; banco: string | null; tipo: string; historico: boolean;
  saldo_abertura: number; data_abertura: string | null;
}

async function fetchContas(): Promise<ContaBancaria[]> {
  const { data } = await supabase.from("contas_bancarias")
    .select("id,nome,banco,tipo,historico,saldo_abertura,data_abertura").eq("ativo", true).order("created_at");
  return (data ?? []).map(r => ({ ...r, saldo_abertura: Number(r.saldo_abertura) })) as ContaBancaria[];
}

/** Contas selecionáveis em lançamentos/importação (sem a conta "Histórico consolidado"). */
export function useContasBancarias() {
  const { contas } = useTodasContas();
  return contas.filter(c => !c.historico);
}

/** Todas as contas ativas, incluindo a de histórico consolidado. */
export function useTodasContas() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchContas().then(c => { if (!cancelled) setContas(c); });
    return () => { cancelled = true; };
  }, [tick]);
  const reload = useCallback(() => setTick(t => t + 1), []);
  return { contas, reload };
}
