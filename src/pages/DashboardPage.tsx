import { useTransactions } from "@/hooks/useTransactions";
import { useAnnualSummary } from "@/hooks/useAnnualSummary";
import { KPICards } from "@/components/dashboard/KPICards";
import { BarChartMensal } from "@/components/dashboard/BarChartMensal";
import { LineChartCaixa } from "@/components/dashboard/LineChartCaixa";
import { TopSaidasList } from "@/components/dashboard/TopSaidasList";
import { Header } from "@/components/layout/Header";

export default function DashboardPage() {
  const { transactions, config } = useTransactions();
  const { months, totalEntradas, totalSaidas, acumuladoAno, caixaAtual } = useAnnualSummary(transactions, config.saldoAnterior, config.ano);

  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 space-y-4">
        <KPICards caixaAtual={caixaAtual} totalEntradas={totalEntradas} totalSaidas={totalSaidas} acumuladoAno={acumuladoAno} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarChartMensal months={months} />
          <LineChartCaixa months={months} saldoAnterior={config.saldoAnterior} />
        </div>
        <TopSaidasList transactions={transactions} currentMonth={currentMonth} />
      </div>
    </div>
  );
}
