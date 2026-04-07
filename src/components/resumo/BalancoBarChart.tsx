import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { MonthSummary } from "@/types";
import { formatCurrency, MONTH_LABELS_SHORT } from "@/utils/formatters";

interface BalancoBarChartProps {
  months: MonthSummary[];
}

export function BalancoBarChart({ months }: BalancoBarChartProps) {
  const data = months.map((m, i) => ({
    name: MONTH_LABELS_SHORT[i],
    balanco: m.balanco,
  }));

  return (
    <div className="bg-card rounded-lg border p-4 animate-fade-in">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Balanço Mensal</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
          <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeWidth={1} />
          <Bar dataKey="balanco" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.balanco >= 0 ? "#0F6E56" : "#A32D2D"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
