import { useEffect, useMemo, useState } from "react";
import { Transaction } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { groupOf } from "@/utils/categories";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ViewMode = "grupo" | "categoria";
export interface DetailSelection { type: "Saída" | "Entrada"; name: string; mode: ViewMode }

/** Soma por grupo do plano de contas (mode "grupo") ou por subcategoria. */
export function totalsBy(txns: Transaction[], mode: ViewMode): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  txns.forEach(t => {
    const k = mode === "grupo" ? groupOf(t.type, t.category) : t.category;
    map[k] = (map[k] || 0) + t.value;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function GroupDetailSheet({ transactions, selected, onClose }: {
  transactions: Transaction[]; selected: DetailSelection | null; onClose: () => void;
}) {
  const [users, setUsers] = useState<Record<string, string>>({});
  const [sub, setSub] = useState("all");
  useEffect(() => { setSub("all"); }, [selected]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    supabase.from("audit_log").select("user_id,user_email").not("user_id", "is", null).not("user_email", "is", null).limit(1000)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, string> = {};
        data.forEach(r => { if (r.user_id && r.user_email) map[r.user_id] = r.user_email; });
        setUsers(map);
      });
    return () => { cancelled = true; };
  }, [selected]);

  const all = useMemo(() => {
    if (!selected) return [];
    return transactions.filter(t => t.type === selected.type &&
      (selected.mode === "grupo" ? groupOf(t.type, t.category) === selected.name : t.category === selected.name))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selected, transactions]);
  const subs = useMemo(() => totalsBy(all, "categoria"), [all]);
  const list = sub === "all" ? all : all.filter(t => t.category === sub);
  const total = list.reduce((s, t) => s + t.value, 0);

  return (
    <Sheet open={!!selected} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{selected?.name}</SheetTitle>
          <SheetDescription>
            {selected?.type === "Saída" ? "Saídas" : "Entradas"} · {list.length} lançamento(s) · Total{" "}
            <span className={selected?.type === "Saída" ? "text-destructive font-semibold" : "text-chart-entrada font-semibold"}>{formatCurrency(total)}</span>
          </SheetDescription>
        </SheetHeader>
        {selected?.mode === "grupo" && subs.length > 1 && (
          <div className="mt-4">
            <Select value={sub} onValueChange={setSub}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as subcategorias</SelectItem>
                {subs.map(s => <SelectItem key={s.name} value={s.name}>{s.name} · {formatCurrency(s.value)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="mt-4 divide-y" data-testid="category-tx-list">
          {list.map(t => (
            <div key={t.id} className="py-2 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground break-words">{t.description}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")}
                  {selected?.mode === "grupo" && ` · ${t.category}`}
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
  );
}

export function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-md border p-0.5 text-xs">
      {(["grupo", "categoria"] as ViewMode[]).map(m => (
        <button key={m} type="button" onClick={() => onChange(m)}
          className={`px-2 py-1 rounded ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          {m === "grupo" ? "Por grupo" : "Por subcategoria"}
        </button>
      ))}
    </div>
  );
}
