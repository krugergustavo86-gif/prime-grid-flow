import { useMemo } from "react";
import { Transaction } from "@/types";
import { isMonthLocked, useLockedMonthsVersion } from "@/utils/lockedMonths";
import { sumTotals } from "@/utils/monthlyTotals";

export function useMonthSummary(monthTxns: Transaction[], monthNum: string, year: number) {
  const lv = useLockedMonthsVersion();
  return useMemo(() => {
    const { entradas, saidas, balanco } = sumTotals(monthTxns);
    return { entradas, saidas, balanco, isLocked: isMonthLocked(monthNum, year) };
  }, [monthTxns, monthNum, year, lv]);
}
