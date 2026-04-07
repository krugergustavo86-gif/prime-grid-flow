import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface KPICardsProps {
  caixaAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  acumuladoAno: number;
}

export function KPICards({ caixaAtual, totalEntradas, totalSaidas, acumuladoAno }: KPICardsProps) {
  const cards = [
    { label: "CAIXA ATUAL", value: caixaAtual, icon: Wallet, accent: "text-primary" },
    { label: "TOTAL ENTRADAS 2026", value: totalEntradas, icon: TrendingUp, accent: "text-chart-entrada" },
    { label: "TOTAL SAÍDAS 2026", value: totalSaidas, icon: TrendingDown, accent: "text-chart-saida" },
    { label: "ACUMULADO 2026", value: acumuladoAno, icon: DollarSign, accent: acumuladoAno >= 0 ? "text-chart-entrada" : "text-chart-saida" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-card rounded-lg border p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <card.icon className={`h-4 w-4 ${card.accent}`} />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {card.label}
            </span>
          </div>
          <p className={`text-lg md:text-xl font-bold tabular-nums ${card.accent}`}>
            {formatCurrency(card.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
