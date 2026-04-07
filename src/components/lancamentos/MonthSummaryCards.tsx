import { TrendingUp, TrendingDown, Scale } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface MonthSummaryCardsProps {
  entradas: number;
  saidas: number;
  balanco: number;
}

export function MonthSummaryCards({ entradas, saidas, balanco }: MonthSummaryCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-card rounded-lg border p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp className="h-3.5 w-3.5 text-chart-entrada" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Entradas</span>
        </div>
        <p className="text-sm md:text-base font-bold tabular-nums text-chart-entrada">{formatCurrency(entradas)}</p>
      </div>
      <div className="bg-card rounded-lg border p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingDown className="h-3.5 w-3.5 text-chart-saida" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Saídas</span>
        </div>
        <p className="text-sm md:text-base font-bold tabular-nums text-chart-saida">{formatCurrency(saidas)}</p>
      </div>
      <div className="bg-card rounded-lg border p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Scale className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Balanço</span>
        </div>
        <p className={`text-sm md:text-base font-bold tabular-nums ${balanco >= 0 ? "text-chart-entrada" : "text-chart-saida"}`}>
          {formatCurrency(balanco)}
        </p>
      </div>
    </div>
  );
}
