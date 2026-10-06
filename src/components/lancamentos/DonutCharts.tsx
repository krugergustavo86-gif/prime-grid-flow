import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Transaction } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { isOperational } from "@/utils/monthlyTotals";
import { supabase } from "@/integrations/supabase/client";

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

function DonutChart({ data, colors, title, onSelect }: { data: { name: string; value: number }[]; colors: string[]; title: string; onSelect: (name: string) => void }) {
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
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}
            className="cursor-pointer">
            {data.map((d, i) => (
              <Cell key={i} fill={colors[i % colors.length]} className="cursor-pointer" onClick={() => onSelect(d.name)} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-0.5 mt-2 max-h-32 overflow-y-auto">
        {data.map((d, i) => (
          <button
            type="button"
            key={d.name}
            data-testid="donut-legend-item"
            onClick={() => onSelect(d.name)}
            className="w-full flex items-center gap-2 text-xs rounded px-1 py-0.5 hover:bg-muted text-left"
          >
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="truncate text-foreground">{d.name}</span>
            <span className="ml-auto tabular-nums text-muted-foreground shrink-0">{total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DonutCharts({ transactions }: DonutChartsProps) {
  const saidas = groupByCategory(transactions.filter(t => t.type === "Saída" && isOperational(t)));
  const entradas = groupByCategory(transactions.filter(t => t.type === "Entrada" && isOperational(t)));
  const [selected, setSelected] = useState<{ type: "Saída" | "Entrada"; category: string } | null>(null);
  const [users, setUsers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("audit_log").select("user_id,user_email").not("user_id", "is", null).not("user_email", "is", null).limit(1000);
      if (cancelled || !data) return;
      const map: Record<string, string> = {};
      data.forEach(r => { if (r.user_id && r.user_email) map[r.user_id] = r.user_email; });
      setUsers(map);
    })();
    return () => { cancelled = true; };
  }, [selected]);

  const list = useMemo(() => {
    if (!selected) return [];
    return transactions
      .filter(t => t.type === selected.type && t.category === selected.category)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selected, transactions]);
  const total = list.reduce((s, t) => s + t.value, 0);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4">
        <DonutChart data={saidas} colors={SAIDA_COLORS} title="Saídas por Categoria" onSelect={c => setSelected({ type: "Saída", category: c })} />
        <DonutChart data={entradas} colors={ENTRADA_COLORS} title="Entradas por Categoria" onSelect={c => setSelected({ type: "Entrada", category: c })} />
      </div>
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.category}</SheetTitle>
            <SheetDescription>
              {selected?.type === "Saída" ? "Saídas" : "Entradas"} · {list.length} lançamento(s) · Total{" "}
              <span className={selected?.type === "Saída" ? "text-destructive font-semibold" : "text-chart-entrada font-semibold"}>{formatCurrency(total)}</span>
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 divide-y" data-testid="category-tx-list">
            {list.map(t => (
              <div key={t.id} className="py-2 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground break-words">{t.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")}
                    {" · "}
                    {t.created_by ? (users[t.created_by] ?? "Usuário") : "Sistema/importação"}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums shrink-0">{formatCurrency(t.value)}</p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
