import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notifyPendenciasChanged } from "@/hooks/usePendenciasCount";
import { getCategoriesByType, normTxt, A_CLASSIFICAR, FORMAS_PAGAMENTO } from "@/utils/categories";
import { formatCurrency, formatDateBR, getMonthFromDate } from "@/utils/formatters";
import { isMonthKeyLocked } from "@/utils/lockedMonths";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";

interface Row { id: string; date: string; description: string; type: "Entrada" | "Saída"; value: number; forma_pagamento: string | null; cliente: string | null }

export default function PendenciasPage() {
  const { isAdmin, canManageLancamentos } = useAuth();
  const canEdit = isAdmin || canManageLancamentos;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<"Entrada" | "Saída">("Entrada");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [cat, setCat] = useState("");
  const [cliente, setCliente] = useState("");
  const [forma, setForma] = useState("");
  const [saveRule, setSaveRule] = useState(false);
  const [ruleText, setRuleText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("transactions")
      .select("id,date,description,type,value,forma_pagamento,cliente")
      .eq("category", A_CLASSIFICAR).order("date", { ascending: false }).order("id").limit(1000);
    return ((data ?? []) as Row[]).map(r => ({ ...r, value: Number(r.value) }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().then(r => { if (!cancelled) { setRows(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [load]);

  const list = useMemo(() => {
    const q = normTxt(search);
    return rows.filter(r => r.type === tipo && (!q || normTxt(r.description).includes(q)));
  }, [rows, tipo, search]);

  const selected = list.filter(r => sel.has(r.id));
  const distinctDesc = Array.from(new Set(selected.map(r => normTxt(r.description).trim())));

  useEffect(() => {
    setRuleText(distinctDesc.length === 1 ? selected[0].description.trim() : "");
    if (distinctDesc.length !== 1) setSaveRule(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distinctDesc.join("|")]);

  const toggle = (id: string) => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel(prev => prev.size === list.length ? new Set() : new Set(list.map(r => r.id)));

  const apply = async () => {
    if (!cat || selected.length === 0) return;
    const blocked = selected.filter(r => isMonthKeyLocked(getMonthFromDate(r.date)));
    const ids = selected.filter(r => !blocked.includes(r)).map(r => r.id);
    setBusy(true);
    const patch: { category: string; regra_aplicada: string; cliente?: string; forma_pagamento?: string } = { category: cat, regra_aplicada: "pendencias: manual" };
    if (cliente.trim()) patch.cliente = cliente.trim();
    if (forma) patch.forma_pagamento = forma;
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from("transactions").update(patch).in("id", ids.slice(i, i + 200));
      if (error) { toast.error("Erro ao classificar"); setBusy(false); return; }
    }
    if (saveRule && ruleText.trim()) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("regras_categoria").insert({
        texto_contem: normTxt(ruleText.trim()), modo: "contem", tipo, categoria: cat,
        forma_pagamento: forma || null, prioridade: 5, created_by: user?.id ?? null,
      });
    }
    const done = new Set(ids);
    setRows(prev => prev.filter(r => !done.has(r.id)));
    setSel(new Set());
    setBusy(false);
    notifyPendenciasChanged();
    toast.success(`${ids.length} classificados${saveRule ? " e regra salva" : ""}${blocked.length ? ` (${blocked.length} em mês fechado ignorados)` : ""}`);
  };

  const count = (t: string) => rows.filter(r => r.type === t).length;

  return (
    <div className="flex flex-col h-full">
      <Header title="Pendências de classificação" />
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" variant={tipo === "Entrada" ? "default" : "outline"} onClick={() => { setTipo("Entrada"); setSel(new Set()); setCat(""); }}>Entradas ({count("Entrada")})</Button>
          <Button size="sm" variant={tipo === "Saída" ? "default" : "outline"} onClick={() => { setTipo("Saída"); setSel(new Set()); setCat(""); }}>Saídas ({count("Saída")})</Button>
          <Input className="max-w-xs ml-auto" placeholder="Buscar descrição…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {canEdit && selected.length > 0 && (
          <div className="sticky top-0 z-10 border rounded-lg p-3 bg-card space-y-2">
            <p className="text-sm font-medium">{selected.length} selecionado(s) · {formatCurrency(selected.reduce((s, r) => s + r.value, 0))}</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>{getCategoriesByType(tipo).filter(c => c !== A_CLASSIFICAR).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Cliente / fornecedor (opcional)" value={cliente} onChange={e => setCliente(e.target.value)} />
              <Select value={forma || "none"} onValueChange={v => setForma(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Forma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manter forma</SelectItem>
                  {FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={apply} disabled={!cat || busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Aplicar</Button>
            </div>
            {distinctDesc.length === 1 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-2"><Checkbox checked={saveRule} onCheckedChange={v => setSaveRule(!!v)} /> Salvar como regra: descrição contém</label>
                <Input className="h-8 max-w-xs" value={ruleText} onChange={e => setRuleText(e.target.value)} disabled={!saveRule} />
              </div>
            )}
          </div>
        )}

        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : list.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhuma pendência.
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {canEdit && (
              <label className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                <Checkbox checked={sel.size > 0 && sel.size === list.length} onCheckedChange={toggleAll} /> Selecionar todos
              </label>
            )}
            {list.map(r => (
              <label key={r.id} className="flex items-center gap-3 p-2 text-sm cursor-pointer hover:bg-muted/50">
                {canEdit && <Checkbox checked={sel.has(r.id)} onCheckedChange={() => toggle(r.id)} />}
                <span className="w-20 text-muted-foreground">{formatDateBR(r.date)}</span>
                <span className="flex-1 min-w-0 truncate">{r.description}</span>
                {r.forma_pagamento && <Badge variant="outline">{r.forma_pagamento}</Badge>}
                {r.cliente && <Badge variant="secondary">{r.cliente}</Badge>}
                <span className="font-semibold tabular-nums">{formatCurrency(r.value)}</span>
              </label>
            ))}
          </div>
        )}
        <Label className="text-xs text-muted-foreground block">Lançamentos de meses fechados não são alterados.</Label>
      </div>
    </div>
  );
}
