import { useTransactions } from "@/hooks/useTransactions";
import { useAnnualSummary } from "@/hooks/useAnnualSummary";
import { usePatrimony } from "@/hooks/usePatrimony";
import { usePatrimonyKPIs } from "@/hooks/usePatrimonyKPIs";
import { KPICards } from "@/components/dashboard/KPICards";
import { BarChartMensal } from "@/components/dashboard/BarChartMensal";
import { LineChartCaixa } from "@/components/dashboard/LineChartCaixa";
import { TopSaidasList } from "@/components/dashboard/TopSaidasList";
import { PatrimonyKPICards } from "@/components/patrimonial/PatrimonyKPICards";
import { Header } from "@/components/layout/Header";
import { AlertCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const CHART_COLORS = [
  "hsl(219, 52%, 25%)", "hsl(162, 76%, 24%)", "hsl(222, 45%, 37%)",
  "hsl(0, 55%, 41%)", "hsl(35, 80%, 50%)",
];

export default function DashboardPage() {
  const { transactions, config } = useTransactions();
  const { months, totalEntradas, totalSaidas, acumuladoAno, caixaAtual } = useAnnualSummary(transactions, config.saldoAnterior, config.ano);
  const patrimony = usePatrimony();
  const kpis = usePatrimonyKPIs(
    { assets: patrimony.assets, receivables: patrimony.receivables, doubtfulCredits: patrimony.doubtfulCredits, cashEntries: patrimony.cashEntries, loans: patrimony.loans, payables: patrimony.payables },
    config.numSocios,
    caixaAtual
  );

  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

  // Upcoming payments (loans + payables)
  const upcomingItems: { label: string; date: string; value: number; type: "loan" | "payable" }[] = [];

  patrimony.loans.forEach(l => {
    if (l.nextPayment) {
      upcomingItems.push({ label: l.contract, date: l.nextPayment, value: l.installmentValue, type: "loan" });
    }
  });

  patrimony.payables.filter(p => p.status !== "Pago" && p.dueDate).forEach(p => {
    // Parse DD/MM/YYYY to sortable
    const parts = p.dueDate!.split("/");
    const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : p.dueDate!;
    upcomingItems.push({ label: p.description, date: isoDate, value: p.value, type: "payable" });
  });

  const sortedUpcoming = upcomingItems.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  const now = new Date();
  function isUrgent(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00");
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }
  function isPast(dateStr: string) {
    return new Date(dateStr + "T12:00:00") < now;
  }

  // Asset distribution donut
  const groupTotals = [
    { name: "Veículos", value: patrimony.assets.filter(a => a.group === "Veículos").reduce((s, a) => s + a.valueMarket, 0) },
    { name: "Imóveis/Terrenos", value: patrimony.assets.filter(a => a.group === "Imóveis/Terrenos").reduce((s, a) => s + a.valueMarket, 0) },
    { name: "Equipamentos", value: patrimony.assets.filter(a => a.group === "Equipamentos").reduce((s, a) => s + a.valueMarket, 0) },
    { name: "Geradores Locados", value: patrimony.assets.filter(a => a.group === "Geradores Locados").reduce((s, a) => s + a.valueMarket, 0) },
    { name: "Outros Ativos", value: patrimony.assets.filter(a => a.group === "Outros Ativos").reduce((s, a) => s + a.valueMarket, 0) },
  ].filter(g => g.value > 0);

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 space-y-6">
        {/* Bloco 1 — Caixa */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Módulo de Caixa</h2>
          <KPICards caixaAtual={caixaAtual} totalEntradas={totalEntradas} totalSaidas={totalSaidas} acumuladoAno={acumuladoAno} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarChartMensal months={months} />
          <LineChartCaixa months={months} saldoAnterior={config.saldoAnterior} />
        </div>

        {/* Bloco 2 — Patrimônio */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Posição Patrimonial</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border p-4 animate-fade-in">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Patrimônio Líquido</p>
              <p className="text-lg md:text-xl font-bold tabular-nums text-chart-entrada">{formatCurrency(kpis.netPatrimony)}</p>
            </div>
            <div className="bg-card rounded-lg border p-4 animate-fade-in">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total a Pagar</p>
              <p className="text-lg md:text-xl font-bold tabular-nums text-destructive">{formatCurrency(kpis.totalAPagar)}</p>
            </div>
            <div className="bg-card rounded-lg border p-4 animate-fade-in">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Taxa Endividamento</p>
              <p className={`text-lg md:text-xl font-bold tabular-nums ${kpis.debtRate <= 0.28 ? "text-success" : kpis.debtRate <= 0.35 ? "text-warning-foreground" : "text-destructive"}`}>
                {(kpis.debtRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">meta: ≤ 28%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Donut patrimônio */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição Patrimonial</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={groupTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                  {groupTotals.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Alertas e vencimentos */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Próximos Vencimentos
            </h3>
            <div className="space-y-2">
              {sortedUpcoming.length === 0 && <p className="text-sm text-muted-foreground">Nenhum vencimento próximo.</p>}
              {sortedUpcoming.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {isPast(item.date) && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">Vencido</Badge>}
                    {!isPast(item.date) && isUrgent(item.date) && <Badge variant="outline" className="bg-warning text-warning-foreground border-warning-foreground/20 text-[10px]">Urgente</Badge>}
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">{formatCurrency(item.value)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <TopSaidasList transactions={transactions} currentMonth={currentMonth} />
      </div>
    </div>
  );
}
