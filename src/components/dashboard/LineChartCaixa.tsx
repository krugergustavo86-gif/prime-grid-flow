import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { MonthSummary } from "@/types";
import { formatCurrency, MONTH_LABELS_SHORT } from "@/utils/formatters";

interface LineChartCaixaProps {
  months: MonthSummary[];
  saldoAnterior: number;
}

export function LineChartCaixa({ months, saldoAnterior }: LineChartCaixaProps) {
  const data = months.map((m, i) => ({
    name: MONTH_LABELS_SHORT[i],
    saldo: m.saldoAcumulado,
  }));

  return (
    <div className="bg-card rounded-lg border p-4 animate-fade-in">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Evolução do Caixa</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1F3864" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#1F3864" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
          <ReferenceLine y={saldoAnterior} stroke="#A32D2D" strokeDasharray="5 5" label={{ value: "Saldo Anterior", fontSize: 10, fill: "#A32D2D" }} />
          <Area type="monotone" dataKey="saldo" stroke="#1F3864" strokeWidth={2} fill="url(#colorSaldo)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
