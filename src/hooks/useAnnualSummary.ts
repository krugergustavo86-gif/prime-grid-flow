import { useMemo } from "react";
import { Transaction, MonthSummary } from "@/types";
import { isMonthLocked } from "@/utils/lockedMonths";
import { MONTH_LABELS } from "@/utils/formatters";
import { computeMonthlyTotals, toMonthKey } from "@/utils/monthlyTotals";

export function useAnnualSummary(transactions: Transaction[], saldoAnterior: number, ano: number) {
  return useMemo(() => {
    const totals = computeMonthlyTotals(transactions);
    const months: MonthSummary[] = [];
    let acumulado = saldoAnterior;

    for (let i = 0; i < 12; i++) {
      const monthNum = String(i + 1).padStart(2, "0");
      const t = totals[toMonthKey(monthNum, ano)];
      const entradas = t?.entradas ?? 0;
      const saidas = t?.saidas ?? 0;
      const balanco = t?.balanco ?? 0;
      acumulado += balanco;
      months.push({
        month: monthNum,
        label: MONTH_LABELS[i],
        entradas,
        saidas,
        balanco,
        saldoAcumulado: acumulado,
        locked: isMonthLocked(monthNum, ano),
      });
    }

    const totalEntradas = months.reduce((s, m) => s + m.entradas, 0);
    const totalSaidas = months.reduce((s, m) => s + m.saidas, 0);
    const acumuladoAno = months.reduce((s, m) => s + m.balanco, 0);
    const caixaAtual = saldoAnterior + acumuladoAno;

    return { months, totalEntradas, totalSaidas, acumuladoAno, caixaAtual };
  }, [transactions, saldoAnterior, ano]);
}
