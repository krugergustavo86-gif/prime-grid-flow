import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { mesKey } from "@/utils/custoOperacional";
import { resumoOS, OrdemServico } from "@/utils/operacaoOS";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";
const addM = (k: string, d: number) => mesKey(new Date(Number(k.slice(0, 4)), Number(k.slice(5)) - 1 + d, 1));
const lbl = (k: string) => new Date(`${k}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
export function OperacaoOS({ transactions }: { transactions: Transaction[] }) {
  const [ordens, setOrdens] = useState<OrdemServico[] | null>(null);
  const [error, setError] = useState(false);
  const [mes, setMes] = useState(() => addM(mesKey(new Date()), -1));
  const [area, setArea] = useState("Todas");
  const [detalhes, setDetalhes] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const all: OrdemServico[] = [];
      for (let from = 0; from < 100000; from += 1000) {
        const { data, error: err } = await supabase.from("ordens_servico").select("numero,cliente,area,status,data_abertura,data_execucao,valor").order("numero").range(from, from + 999);
        if (err) { if (alive) setError(true); return; }
        if (!data?.length) break;
        all.push(...data.map(o => ({ ...o, valor: o.valor === null ? null : Number(o.valor) })));
        if (data.length < 1000) break;
      }
      if (alive) setOrdens(all);
    })();
    return () => { alive = false; };
  }, []);
  const r = useMemo(() => resumoOS(ordens ?? [], mes, area), [ordens, mes, area]);
  const areas = useMemo(() => Array.from(new Set((ordens ?? []).flatMap(o => o.area ? [o.area] : []))).sort(), [ordens]);
  const porArea = useMemo(() => (area === "Todas" ? areas : [area]).map(a => ({ area: a, r: resumoOS(ordens ?? [], mes, a) })), [ordens, areas, mes, area]);
  const recebidas = useMemo(() => new Set(transactions.filter(t => t.type === "Entrada").flatMap(t => {
    const m = (t.notes ?? "").match(/OS:\s*([^\s|]+)/) ?? t.description.match(/OS #(\S+)/);
    return m ? [m[1]] : [];
  })), [transactions]);
  const semVinculo = r.comValor.filter(o => !recebidas.has(o.numero));
  const meses = Array.from({ length: 12 }, (_, i) => addM(mesKey(new Date()), -i));
  return <section aria-labelledby="operacao-title" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="operacao-title" className="text-sm font-semibold uppercase text-muted-foreground">Operação / OS</h2>
      <div className="flex flex-wrap gap-2">
        <Select value={mes} onValueChange={setMes}><SelectTrigger aria-label="Mês das OS" className="w-36"><SelectValue /></SelectTrigger><SelectContent>{meses.map(k => <SelectItem key={k} value={k}>{lbl(k)}</SelectItem>)}</SelectContent></Select>
        <Select value={area} onValueChange={setArea}><SelectTrigger aria-label="Área das OS" className="w-44"><SelectValue /></SelectTrigger><SelectContent>{["Todas", ...areas].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
      </div>
    </div>
    {error ? <p className="text-sm text-destructive">Não foi possível carregar as OS.</p> : ordens === null ? <p className="text-sm text-muted-foreground">Carregando OS…</p> : !ordens.length ? <p className="text-sm text-muted-foreground">Sem OS recebidas do OPS.</p> : <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">OS executadas</p><p className="text-xl font-bold tabular-nums">{r.executadas.length}</p><p className="text-xs text-muted-foreground">{r.abertas.length} abertas no mês</p></div>
        <div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">Valor das OS executadas</p><p className="text-xl font-bold tabular-nums">{formatCurrency(r.valor)}</p><p className="text-xs text-muted-foreground">{r.comValor.length} OS com valor positivo</p></div>
        <div className="bg-card border border-primary rounded-lg p-4"><p className="text-xs text-muted-foreground">Ticket médio · OS com valor</p><p className="text-xl font-bold tabular-nums text-primary">{r.ticket === null ? "—" : formatCurrency(r.ticket)}</p><p className="text-xs text-muted-foreground">{r.semValor.length} OS sem valor fora da média</p></div>
        <div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">OS em aberto</p><p className="text-xl font-bold tabular-nums">{r.backlog.length}</p><p className="text-xs text-muted-foreground">{r.backlog30.length} há mais de 30 dias · {r.referencia.split("-").reverse().join("/")}</p></div>
      </div>
      {r.negativos.length > 0 && <p className="text-xs text-destructive">{r.negativos.length} OS com valor negativo fora da média financeira.</p>}
      <Button variant="ghost" size="sm" aria-expanded={detalhes} onClick={() => setDetalhes(v => !v)}>{detalhes ? <ChevronUp /> : <ChevronDown />}{detalhes ? "Recolher detalhes de OS" : "Detalhes de OS"}</Button>
      {detalhes && <div className="space-y-4 border-t pt-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground"><span>Ticket incluindo OS sem valor: {r.ticketComZero === null ? "—" : formatCurrency(r.ticketComZero)}</span><span>Tempo médio de execução: {r.tempo === null ? "—" : `${r.tempo.toFixed(1)} dias`}</span></div>
        <Table><TableHeader><TableRow><TableHead>Área</TableHead><TableHead className="text-right">Executadas</TableHead><TableHead className="text-right">Sem valor</TableHead><TableHead className="text-right">Ticket com valor</TableHead></TableRow></TableHeader><TableBody>{porArea.map(p => <TableRow key={p.area}><TableCell>{p.area}</TableCell><TableCell className="text-right">{p.r.executadas.length}</TableCell><TableCell className="text-right">{p.r.semValor.length}</TableCell><TableCell className="text-right tabular-nums">{p.r.ticket === null ? "—" : formatCurrency(p.r.ticket)}</TableCell></TableRow>)}</TableBody></Table>
        <h3 className="text-sm font-medium">OS do mês sem vínculo identificado no caixa ({semVinculo.length})</h3>
        <div className="max-h-64 overflow-auto"><Table><TableHeader><TableRow><TableHead>OS</TableHead><TableHead>Cliente</TableHead><TableHead>Área</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{semVinculo.map(o => <TableRow key={o.numero}><TableCell>{o.numero}</TableCell><TableCell>{o.cliente}</TableCell><TableCell>{o.area}</TableCell><TableCell className="text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(o.valor))}</TableCell></TableRow>)}</TableBody></Table></div>
      </div>}
    </>}
  </section>;
}
