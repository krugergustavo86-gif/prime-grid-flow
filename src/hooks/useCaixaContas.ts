import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { useTodasContas } from "@/hooks/useContasBancarias";
import { saldosPorConta } from "@/utils/saldosContas";

/** Caixa Atual = soma dos saldos por conta + data da última conciliação. */
export function useCaixaContas(transactions: Transaction[], saldoAnterior: number) {
  const { contas } = useTodasContas();
  const [ultima, setUltima] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.from("conciliacoes").select("data").order("data", { ascending: false }).limit(1)
      .then(({ data }) => { if (!cancelled) setUltima(data?.[0]?.data ?? null); });
    return () => { cancelled = true; };
  }, []);
  return useMemo(() => {
    const saldos = saldosPorConta(contas, transactions, saldoAnterior);
    const total = Math.round(Object.values(saldos).reduce((s, v) => s + v, 0) * 100) / 100;
    return { contas, saldos, total: contas.length ? total : undefined, ultimaConciliacao: ultima };
  }, [contas, transactions, saldoAnterior, ultima]);
}
