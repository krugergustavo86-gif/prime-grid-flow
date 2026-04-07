import { Lock } from "lucide-react";
import { MonthSummary } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AnnualTableProps {
  months: MonthSummary[];
}

export function AnnualTable({ months }: AnnualTableProps) {
  const totalEntradas = months.reduce((s, m) => s + m.entradas, 0);
  const totalSaidas = months.reduce((s, m) => s + m.saidas, 0);
  const totalBalanco = months.reduce((s, m) => s + m.balanco, 0);

  return (
    <div className="bg-card rounded-lg border overflow-x-auto animate-fade-in">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-3 font-medium text-muted-foreground">Mês</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Entradas</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Saídas</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Balanço</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Saldo Acumulado</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month} className={`border-b ${m.locked ? "bg-warning/30" : "hover:bg-muted/20"}`}>
              <td className="p-3 font-medium text-foreground">
                <div className="flex items-center gap-1.5">
                  {m.locked && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Lock className="h-3.5 w-3.5 text-warning-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>Mês fechado</TooltipContent>
                    </Tooltip>
                  )}
                  {m.label}
                </div>
              </td>
              <td className="p-3 text-right tabular-nums text-chart-entrada">{formatCurrency(m.entradas)}</td>
              <td className="p-3 text-right tabular-nums text-chart-saida">{formatCurrency(m.saidas)}</td>
              <td className={`p-3 text-right tabular-nums font-semibold ${m.balanco >= 0 ? "text-chart-entrada" : "text-chart-saida"}`}>
                {formatCurrency(m.balanco)}
              </td>
              <td className="p-3 text-right tabular-nums font-medium text-foreground">{formatCurrency(m.saldoAcumulado)}</td>
            </tr>
          ))}
          <tr className="bg-muted/50 font-bold">
            <td className="p-3 text-foreground">TOTAL</td>
            <td className="p-3 text-right tabular-nums text-chart-entrada">{formatCurrency(totalEntradas)}</td>
            <td className="p-3 text-right tabular-nums text-chart-saida">{formatCurrency(totalSaidas)}</td>
            <td className={`p-3 text-right tabular-nums ${totalBalanco >= 0 ? "text-chart-entrada" : "text-chart-saida"}`}>
              {formatCurrency(totalBalanco)}
            </td>
            <td className="p-3 text-right text-muted-foreground">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
