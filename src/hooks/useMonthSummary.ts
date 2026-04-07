import { useMemo } from "react";
import { Transaction } from "@/types";
import { LOCKED_MONTHS, LOCKED_BALANCES } from "@/utils/seed";

export function useMonthSummary(transactions: Transaction[], monthNum: string) {
  return useMemo(() => {
    const monthTxns = transactions.filter(t => t.month.startsWith(monthNum + "/"));
    const entradas = monthTxns.filter(t => t.type === "Entrada").reduce((s, t) => s + t.value, 0);
    const saidas = monthTxns.filter(t => t.type === "Saída").reduce((s, t) => s + t.value, 0);
    const isLocked = LOCKED_MONTHS.includes(monthNum);
    const balanco = isLocked ? LOCKED_BALANCES[monthNum] : entradas - saidas;
    return { entradas, saidas, balanco, isLocked };
  }, [transactions, monthNum]);
}
