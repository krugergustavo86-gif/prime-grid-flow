import { useMemo, useState } from "react";
import { formatCurrency } from "@/utils/formatters";
import { compareSnapshot, SnapshotDetail, SnapshotRow } from "@/utils/patrimonySnapshot";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const fmtMonth = (m: string) => { const [mm, y] = m.split("/"); return `${LABELS[Number(mm) - 1] ?? mm}/${y}`; };
const key = (m: string) => { const [mm, y] = m.split("/"); return Number(y) * 100 + Number(mm); };

export function PatrimonyCompare({ current, snapshots, numSocios }: { current: SnapshotDetail; snapshots: SnapshotRow[]; numSocios: number }) {
  const now = new Date();
  const curMonth = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const options = useMemo(() => snapshots.filter(s => s.month !== curMonth).sort((a, b) => key(b.month) - key(a.month)), [snapshots, curMonth]);
  const [month, setMonth] = useState<string>("none");
  const past = options.find(s => s.month === month);
  const result = past ? compareSnapshot(current, past, numSocios) : null;

  return (
    <div className="bg-card rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">Comparar com mês anterior</h3>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-44" aria-label="Mês para comparar"><SelectValue placeholder="Escolha o mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem comparação</SelectItem>
            {options.map(s => <SelectItem key={s.month} value={s.month}>{fmtMonth(s.month)}{s.detail ? "" : " (só totais)"}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {result && past && (
        <>
          {!result.hasDetail && (
            <p className="text-xs rounded-md border border-primary/30 bg-primary/10 p-2 text-foreground">
              Detalhe indisponível para {fmtMonth(past.month)}: essa foto guardou só patrimônio bruto, dívida e líquido.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="text-left p-2 font-medium">Item</th>
                  <th className="text-right p-2 font-medium">Atual</th>
                  <th className="text-right p-2 font-medium">{fmtMonth(past.month)}</th>
                  <th className="text-right p-2 font-medium">Diferença</th>
                  <th className="text-right p-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.filter(l => result.hasDetail || l.past != null).map(l => {
                  const good = l.diff == null ? null : (l.kind === "debt" ? l.diff <= 0 : l.diff >= 0);
                  return (
                    <tr key={l.key} className={cn("border-b", l.kind === "total" && "font-semibold")}>
                      <td className="p-2">{l.kind === "debt" ? "− " : ""}{l.label}</td>
                      <td className="p-2 text-right tabular-nums">{formatCurrency(l.current)}</td>
                      <td className="p-2 text-right tabular-nums text-muted-foreground">{l.past == null ? "—" : formatCurrency(l.past)}</td>
                      <td className={cn("p-2 text-right tabular-nums", good === true && "text-success", good === false && "text-destructive")}>
                        {l.diff == null ? "—" : `${l.diff > 0 ? "+" : ""}${formatCurrency(l.diff)}`}
                      </td>
                      <td className="p-2 text-right tabular-nums text-muted-foreground">{l.pct == null ? "—" : `${l.pct > 0 ? "+" : ""}${l.pct.toFixed(1).replace(".", ",")}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
