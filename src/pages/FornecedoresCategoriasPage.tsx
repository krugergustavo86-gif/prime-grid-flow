import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCategoryRules, ruleMatches, CategoryRule } from "@/hooks/useCategoryRules";
import { getCategoriesByType, normTxt, FORMAS_PAGAMENTO } from "@/utils/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Row { id: string; description: string; type: string; category: string; value: number }
interface Group { key: string; label: string; type: string; total: number; count: number; cats: { category: string; count: number; total: number }[] }

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FornecedoresCategoriasPage() {
  const { isAdmin } = useAuth();
  const { rules, refresh } = useCategoryRules();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<Group | null>(null);
  const [texto, setTexto] = useState("");
  const [cat, setCat] = useState("");
  const [forma, setForma] = useState("");
  const [applyHistory, setApplyHistory] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const out: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("transactions")
        .select("id,description,type,category,value").order("date").order("id").range(from, from + 999);
      if (error) { console.error(error); break; }
      out.push(...(data ?? []).map(r => ({ ...r, value: Number(r.value) })));
      if (!data || data.length < 1000) break;
    }
    return out;
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().then(r => { if (!cancelled) { setRows(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; type: string; cats: Map<string, { count: number; total: number }> }>();
    for (const r of rows) {
      const k = `${r.type}|${normTxt(r.description).trim()}`;
      if (!map.has(k)) map.set(k, { label: r.description.trim(), type: r.type, cats: new Map() });
      const g = map.get(k)!;
      const c = g.cats.get(r.category) ?? { count: 0, total: 0 };
      c.count++; c.total += r.value;
      g.cats.set(r.category, c);
    }
    const list: Group[] = [];
    for (const [key, g] of map) {
      if (g.cats.size < 2) continue;
      const cats = [...g.cats].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.count - a.count);
      list.push({ key, label: g.label, type: g.type, cats,
        count: cats.reduce((s, c) => s + c.count, 0), total: cats.reduce((s, c) => s + c.total, 0) });
    }
    const q = normTxt(search);
    return list.filter(g => !q || normTxt(g.label).includes(q)).sort((a, b) => b.count - a.count);
  }, [rows, search]);

  const openDialog = (g: Group) => {
    setTarget(g); setTexto(g.label); setCat(g.cats[0].category); setForma(""); setApplyHistory(true);
  };

  const previewCount = useMemo(() => {
    if (!target || !texto.trim()) return 0;
    const fake = { texto_contem: texto, modo: "contem", tipo: target.type, categoria_origem: null } as CategoryRule;
    return rows.filter(r => ruleMatches(fake, r.type, r.description) && r.category !== cat).length;
  }, [target, texto, cat, rows]);

  const save = async () => {
    if (!target || !texto.trim() || !cat) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("regras_categoria").insert({
      texto_contem: normTxt(texto.trim()), modo: "contem", tipo: target.type, categoria: cat,
      forma_pagamento: forma || null, prioridade: 5, created_by: user?.id ?? null,
    });
    if (error) { toast.error("Erro ao salvar regra"); setSaving(false); return; }
    let changed = 0;
    if (applyHistory) {
      const fake = { texto_contem: texto, modo: "contem", tipo: target.type, categoria_origem: null } as CategoryRule;
      const ids = rows.filter(r => ruleMatches(fake, r.type, r.description) && r.category !== cat).map(r => r.id);
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { error: e } = await supabase.from("transactions")
          .update({ category: cat, regra_aplicada: `fornecedor: ${normTxt(texto.trim())}` }).in("id", chunk);
        if (e) { toast.error("Erro ao aplicar ao histórico"); break; }
        changed += chunk.length;
      }
      const idSet = new Set(ids);
      setRows(prev => prev.map(r => idSet.has(r.id) ? { ...r, category: cat } : r));
    }
    toast.success(`Regra salva${applyHistory ? ` — ${changed} lançamentos reclassificados` : ""}`);
    await refresh();
    setSaving(false);
    setTarget(null);
  };

  const removeRule = async (id: string) => {
    const { error } = await supabase.from("regras_categoria").delete().eq("id", id);
    if (error) toast.error("Erro ao remover"); else refresh();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fornecedores com categorias diferentes</h1>
        <p className="text-sm text-muted-foreground">Descrições lançadas em mais de uma categoria. Defina a categoria padrão para criar uma regra.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{loading ? "Carregando…" : `${groups.length} descrições`}</CardTitle>
          <Input className="max-w-xs" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} />
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {groups.slice(0, 200).map(g => (
            <div key={g.key} className="rounded-md border p-3 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{g.label}</span>
                  <Badge variant="outline">{g.type}</Badge>
                  <span className="text-xs text-muted-foreground">{g.count} lanç. · {brl(g.total)}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {g.cats.map(c => (
                    <Badge key={c.category} variant="secondary" className="font-normal">
                      {c.category}: {c.count} · {brl(c.total)}
                    </Badge>
                  ))}
                </div>
              </div>
              {isAdmin && <Button size="sm" onClick={() => openDialog(g)}>Definir categoria padrão</Button>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Regras cadastradas ({rules.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {rules.map(r => (
            <div key={r.id} className="flex items-center gap-2 text-sm border-b py-1">
              <span className="flex-1">
                {r.modo === "igual" ? "igual a" : "contém"} "<b>{r.texto_contem}</b>" · {r.tipo}
                {r.categoria_origem ? ` · só em ${r.categoria_origem}` : ""} → <b>{r.categoria}</b>
                {r.forma_pagamento ? ` · ${r.forma_pagamento}` : ""}
              </span>
              {isAdmin && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRule(r.id)}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={o => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Definir categoria padrão</DialogTitle></DialogHeader>
          {target && (
            <div className="space-y-3">
              <div><Label>Descrição contém</Label><Input className="mt-1" value={texto} onChange={e => setTexto(e.target.value)} /></div>
              <div>
                <Label>Categoria</Label>
                <Select value={cat} onValueChange={setCat}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{getCategoriesByType(target.type as "Entrada" | "Saída").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de pagamento (opcional)</Label>
                <Select value={forma || "none"} onValueChange={v => setForma(v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não definir</SelectItem>
                    {FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={applyHistory} onCheckedChange={v => setApplyHistory(!!v)} />
                Aplicar ao histórico ({previewCount} lançamentos mudam de categoria; valores e datas não mudam)
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !texto.trim() || !cat}>{saving ? "Salvando…" : "Salvar regra"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
