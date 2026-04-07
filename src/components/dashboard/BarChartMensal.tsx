import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MonthSummary } from "@/types";
import { formatCurrency, MONTH_LABELS_SHORT } from "@/utils/formatters";

interface BarChartMensalProps {
  months: MonthSummary[];
}

export function BarChartMensal({ months }: BarChartMensalProps) {
  const data = months.map((m, i) => ({
    name: MONTH_LABELS_SHORT[i],
    Entradas: m.entradas,
    Saídas: m.saidas,
  }));

  return (
    <div className="bg-card rounded-lg border p-4 animate-fade-in">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Entradas x Saídas por Mês</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Entradas" fill="#0F6E56" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Saídas" fill="#A32D2D" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
