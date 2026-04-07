import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Transaction } from "@/types";
import { formatCurrency } from "@/utils/formatters";

const SAIDA_COLORS = ["#A32D2D", "#C44D4D", "#D46A6A", "#E08888", "#EBA5A5", "#D45C2E", "#E07A4E", "#CC3333", "#B54040", "#993333", "#CC6633", "#DD8855", "#AA4422", "#BB6644", "#CC8866", "#DD9977"];
const ENTRADA_COLORS = ["#0F6E56", "#1A8A6E", "#25A686", "#30C29E", "#4DD4B0", "#0A5C47", "#147A60", "#1E9878", "#28B690", "#32D4A8"];

interface DonutChartsProps {
  transactions: Transaction[];
}

function groupByCategory(txns: Transaction[]): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  txns.forEach(t => { map[t.category] = (map[t.category] || 0) + t.value; });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function DonutChart({ data, colors, title }: { data: { name: string; value: number }[]; colors: string[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex-1 bg-card rounded-lg border p-4">
        <h4 className="text-sm font-semibold mb-2 text-foreground">{title}</h4>
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Sem dados</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-card rounded-lg border p-4 min-w-0">
      <h4 className="text-sm font-semibold mb-2 text-foreground">{title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1 mt-2 max-h-32 overflow-y-auto">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="truncate text-foreground">{d.name}</span>
            <span className="ml-auto tabular-nums text-muted-foreground shrink-0">{total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutCharts({ transactions }: DonutChartsProps) {
  const saidas = groupByCategory(transactions.filter(t => t.type === "Saída"));
  const entradas = groupByCategory(transactions.filter(t => t.type === "Entrada"));

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <DonutChart data={saidas} colors={SAIDA_COLORS} title="Saídas por Categoria" />
      <DonutChart data={entradas} colors={ENTRADA_COLORS} title="Entradas por Categoria" />
    </div>
  );
}
