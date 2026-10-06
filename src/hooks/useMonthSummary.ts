import { useMemo } from "react";
import { Transaction } from "@/types";
import { isMonthLocked } from "@/utils/lockedMonths";
import { sumTotals } from "@/utils/monthlyTotals";

export function useMonthSummary(monthTxns: Transaction[], monthNum: string, year: number) {
  return useMemo(() => {
    const { entradas, saidas, balanco } = sumTotals(monthTxns);
    return { entradas, saidas, balanco, isLocked: isMonthLocked(monthNum, year) };
  }, [monthTxns, monthNum, year]);
}
