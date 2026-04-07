import { useTransactions } from "@/hooks/useTransactions";
import { useAnnualSummary } from "@/hooks/useAnnualSummary";
import { Header } from "@/components/layout/Header";
import { AnnualTable } from "@/components/resumo/AnnualTable";
import { TotalizadorCards } from "@/components/resumo/TotalizadorCards";
import { BalancoBarChart } from "@/components/resumo/BalancoBarChart";

export default function ResumoPage() {
  const { transactions, config } = useTransactions();
  const { months, acumuladoAno, caixaAtual } = useAnnualSummary(transactions, config.saldoAnterior, config.ano);

  return (
    <div className="flex flex-col h-full">
      <Header title="Resumo Anual" />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 space-y-4">
        <AnnualTable months={months} />
        <TotalizadorCards saldoAnterior={config.saldoAnterior} acumuladoAno={acumuladoAno} caixaAtual={caixaAtual} ano={config.ano} />
        <BalancoBarChart months={months} />
      </div>
    </div>
  );
}
