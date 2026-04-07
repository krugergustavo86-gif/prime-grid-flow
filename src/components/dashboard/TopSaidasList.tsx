import { Transaction } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Progress } from "@/components/ui/progress";

interface TopSaidasListProps {
  transactions: Transaction[];
  currentMonth: string;
}

export function TopSaidasList({ transactions, currentMonth }: TopSaidasListProps) {
  const saidas = transactions.filter(t => t.type === "Saída" && t.month.startsWith(currentMonth + "/"));
  const totalSaidas = saidas.reduce((s, t) => s + t.value, 0);

  const byCategory: Record<string, number> = {};
  saidas.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.value;
  });

  const sorted = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-4 animate-fade-in">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Top 5 Saídas do Mês</h3>
        <p className="text-sm text-muted-foreground">Nenhuma saída registrada este mês.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-4 animate-fade-in">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Top 5 Saídas do Mês</h3>
      <div className="space-y-3">
        {sorted.map(([category, value]) => {
          const pct = totalSaidas > 0 ? (value / totalSaidas) * 100 : 0;
          return (
            <div key={category}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground font-medium truncate">{category}</span>
                <span className="text-muted-foreground tabular-nums ml-2 shrink-0">
                  {formatCurrency(value)} ({pct.toFixed(0)}%)
                </span>
              </div>
              <Progress value={pct} className="h-2 [&>div]:bg-chart-saida" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
