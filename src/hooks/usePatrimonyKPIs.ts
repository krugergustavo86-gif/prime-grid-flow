import { useMemo } from "react";
import { PatrimonyData } from "@/types";

export function usePatrimonyKPIs(data: PatrimonyData, numSocios: number, caixaAtual?: number) {
  return useMemo(() => {
    const totalAssets = data.assets.reduce((s, a) => s + a.valueMarket, 0);
    const totalReceivables = data.receivables.reduce((s, r) => s + r.value, 0);
    const totalCash = data.cashEntries.reduce((s, c) => s + c.balance, 0);
    const totalDoubtful = data.doubtfulCredits.reduce((s, d) => s + d.value, 0);

    // Use caixaAtual from transactions module when available, otherwise fall back to cash_entries
    const cashAvailable = caixaAtual ?? data.cashEntries
      .filter(c => c.description.toLowerCase().includes("saldo em conta"))
      .reduce((s, c) => s + c.balance, 0);

    const totalLoanBalance = data.loans.reduce((s, l) => {
      const open = l.totalInstallments - l.paidInstallments;
      return s + open * l.installmentValue;
    }, 0);

    const totalPayables = data.payables
      .filter(p => p.status !== "Pago")
      .reduce((s, p) => s + p.value, 0);

    // Include caixaAtual in gross patrimony when provided
    const grossPatrimony = totalAssets + totalReceivables + (caixaAtual !== undefined ? caixaAtual : totalCash);
    const totalAPagar = totalLoanBalance + totalPayables;
    const netPatrimony = grossPatrimony - totalAPagar;
    const perPartner = numSocios > 0 ? netPatrimony / numSocios : netPatrimony;
    const debtRate = grossPatrimony > 0 ? totalAPagar / grossPatrimony : 0;

    return {
      grossPatrimony,
      netPatrimony,
      perPartner,
      totalAPagar,
      cashAvailable,
      totalReceivables,
      totalDoubtful,
      totalAssets,
      totalLoanBalance,
      totalPayables,
      debtRate,
    };
  }, [data, numSocios, caixaAtual]);
}
