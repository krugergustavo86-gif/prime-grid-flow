import { useMemo } from "react";
import { Transaction, MonthSummary } from "@/types";
import { LOCKED_MONTHS, LOCKED_BALANCES } from "@/utils/lockedMonths";
import { MONTH_LABELS } from "@/utils/formatters";

export function useAnnualSummary(transactions: Transaction[], saldoAnterior: number, ano: number) {
  return useMemo(() => {
    const months: MonthSummary[] = [];
    let acumulado = saldoAnterior;

    for (let i = 0; i < 12; i++) {
      const monthNum = String(i + 1).padStart(2, "0");
      const monthKey = `${monthNum}/${ano}`;
      const monthTxns = transactions.filter(t => t.month === monthKey);
      const entradas = monthTxns.filter(t => t.type === "Entrada").reduce((s, t) => s + t.value, 0);
      const saidas = monthTxns.filter(t => t.type === "Saída").reduce((s, t) => s + t.value, 0);
      const isLocked = LOCKED_MONTHS.includes(monthNum);
      const balanco = isLocked ? LOCKED_BALANCES[monthNum] : entradas - saidas;
      acumulado += balanco;

      months.push({
        month: monthNum,
        label: MONTH_LABELS[i],
        entradas,
        saidas,
        balanco,
        saldoAcumulado: acumulado,
        locked: isLocked,
      });
    }

    const totalEntradas = months.reduce((s, m) => s + m.entradas, 0);
    const totalSaidas = months.reduce((s, m) => s + m.saidas, 0);
    const acumuladoAno = months.reduce((s, m) => s + m.balanco, 0);
    const caixaAtual = saldoAnterior + acumuladoAno;

    return { months, totalEntradas, totalSaidas, acumuladoAno, caixaAtual };
  }, [transactions, saldoAnterior, ano]);
}
