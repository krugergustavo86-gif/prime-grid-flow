import { useMemo } from "react";
import { Transaction, AppConfig } from "@/types";
import { usePatrimony } from "@/hooks/usePatrimony";
import { usePatrimonyKPIs } from "@/hooks/usePatrimonyKPIs";
import { useStock } from "@/hooks/useStock";
import { useAnnualSummary } from "@/hooks/useAnnualSummary";
import { useCaixaContas } from "@/hooks/useCaixaContas";
import { formatDateBR } from "@/utils/formatters";
import { isOperational } from "@/utils/monthlyTotals";

/** "DD/MM/YYYY" ou "YYYY-MM-DD" -> "YYYY-MM-DD" */
function toISO(d?: string | null): string | null {
  if (!d) return null;
  const p = d.split("/");
  if (p.length === 2) return `${new Date().getFullYear()}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`; // sem ano: ano corrente
  return p.length === 3 ? `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}` : d.slice(0, 10);
}

/**
 * FONTE ÚNICA da posição patrimonial: Ativo (com estoque), Passivo, PL, Taxa de endividamento,
 * Liquidez corrente e imediata. Caixa = soma dos saldos por conta.
 */
export function usePosicaoPatrimonial(transactions: Transaction[], config: AppConfig) {
  const { caixaAtual: caixaMeses } = useAnnualSummary(transactions, config.saldoAnterior, config.ano);
  const caixaContas = useCaixaContas(transactions, config.saldoAnterior);
  const caixaAtual = caixaContas.total ?? caixaMeses;
  const caixaNota = caixaContas.ultimaConciliacao
    ? `Soma das contas · conciliado em ${formatDateBR(caixaContas.ultimaConciliacao)}`
    : "Soma das contas · sem conciliação";
  const patrimony = usePatrimony();
  const { totalValue: stockTotal } = useStock();
  const kpis = usePatrimonyKPIs(patrimony, config.numSocios, caixaAtual, stockTotal);

  const liquidez = useMemo(() => {
    const pend = patrimony.payables.filter(p => p.status !== "Pago");
    const passivoCirculante = pend.reduce((s, p) => s + p.value, 0);
    const ativoCirculante = kpis.cashAvailable + kpis.totalReceivables;
    const lim = new Date(); lim.setDate(lim.getDate() + 90);
    const limISO = lim.toISOString().slice(0, 10);
    // A pagar em até 90 dias (inclui vencidas e sem data)
    const passivo90 = pend.filter(p => { const d = toISO(p.dueDate); return !d || d <= limISO; })
      .reduce((s, p) => s + p.value, 0);
    return {
      ativoCirculante, passivoCirculante, passivo90,
      liquidezCorrente: passivoCirculante > 0 ? ativoCirculante / passivoCirculante : 0,
      liquidezImediata: passivo90 > 0 ? kpis.cashAvailable / passivo90 : 0,
    };
  }, [patrimony.payables, kpis.cashAvailable, kpis.totalReceivables]);

  return { patrimony, stockTotal, caixaAtual, caixaNota, kpis, ...liquidez };
}

/** Margem de lucro operacional: só categorias operacionais (exclui Não operacional, Investimentos e ajustes). */
export function margemOperacional(transactions: Transaction[], start: string, end: string) {
  let receita = 0, despesa = 0;
  for (const t of transactions) {
    if (t.date < start || t.date > end || !isOperational(t)) continue;
    if (t.type === "Entrada") receita += t.value; else despesa += t.value;
  }
  return { receita, despesa, lucro: receita - despesa, margem: receita > 0 ? ((receita - despesa) / receita) * 100 : null };
}
