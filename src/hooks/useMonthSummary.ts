import { useMemo } from "react";
import { Transaction } from "@/types";
import { LOCKED_MONTHS, LOCKED_BALANCES } from "@/utils/lockedMonths";

export function useMonthSummary(monthTxns: Transaction[], monthNum: string) {
  return useMemo(() => {
    const entradas = monthTxns.filter(t => t.type === "Entrada").reduce((s, t) => s + t.value, 0);
    const saidas = monthTxns.filter(t => t.type === "Saída").reduce((s, t) => s + t.value, 0);
    const isLocked = LOCKED_MONTHS.includes(monthNum);
    const balanco = isLocked ? LOCKED_BALANCES[monthNum] : entradas - saidas;
    return { entradas, saidas, balanco, isLocked };
  }, [monthTxns, monthNum]);
}
