import { formatCurrency } from "@/utils/formatters";
import { TrendingUp, TrendingDown, Building2, Users, CreditCard, Percent } from "lucide-react";

interface Props {
  grossPatrimony: number;
  netPatrimony: number;
  perPartner: number;
  totalAPagar: number;
  cashAvailable: number;
  debtRate: number;
}

export function PatrimonyKPICards({ grossPatrimony, netPatrimony, perPartner, totalAPagar, cashAvailable, debtRate }: Props) {
  const debtPct = (debtRate * 100).toFixed(1);
  const debtColor = debtRate <= 0.28 ? "text-success" : debtRate <= 0.35 ? "text-warning-foreground" : "text-destructive";

  const cards = [
    { label: "PATRIMÔNIO BRUTO", value: formatCurrency(grossPatrimony), icon: Building2, accent: "text-primary" },
    { label: "PATRIMÔNIO LÍQUIDO", value: formatCurrency(netPatrimony), icon: TrendingUp, accent: "text-chart-entrada" },
    { label: "POR SÓCIO", value: formatCurrency(perPartner), icon: Users, accent: "text-chart-blue-medium" },
    { label: "TOTAL A PAGAR", value: formatCurrency(totalAPagar), icon: TrendingDown, accent: "text-destructive" },
    { label: "CAIXA DISPONÍVEL", value: formatCurrency(cashAvailable), icon: CreditCard, accent: "text-primary" },
    { label: "TAXA ENDIVIDAMENTO", value: `${debtPct}%`, icon: Percent, accent: debtColor, sub: "meta: ≤ 28%" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-card rounded-lg border p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <card.icon className={`h-4 w-4 ${card.accent}`} />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{card.label}</span>
          </div>
          <p className={`text-lg md:text-xl font-bold tabular-nums ${card.accent}`}>{card.value}</p>
          {card.sub && <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}
