import { useMemo } from "react";
import { Transaction } from "@/types";
import { isMonthLocked, getLockedBalance } from "@/utils/lockedMonths";

export function useMonthSummary(monthTxns: Transaction[], monthNum: string, year: number) {
  return useMemo(() => {
    const entradas = monthTxns.filter(t => t.type === "Entrada").reduce((s, t) => s + t.value, 0);
    const saidas = monthTxns.filter(t => t.type === "Saída").reduce((s, t) => s + t.value, 0);
    const isLocked = isMonthLocked(monthNum, year);
    const balanco = isLocked ? (getLockedBalance(monthNum, year) as number) : entradas - saidas;
    return { entradas, saidas, balanco, isLocked };
  }, [monthTxns, monthNum, year]);
}
