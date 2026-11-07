import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Transaction } from "@/types";
import { custoInicioMes, PERIODO_INICIAL } from "@/utils/custoInicioMes";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const labelMes = (mes: string) => new Date(`${mes}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
export function CustoInicioMes({ transactions, loading }: { transactions: Transaction[]; loading: boolean }) {
  const [n, setN] = useState(PERIODO_INICIAL);
  const [detalhe, setDetalhe] = useState<number | null>(null);
  const data = useMemo(() => custoInicioMes(transactions, n), [transactions, n]);
  const grupo = detalhe === null ? null : data.grupos[detalhe];
  const moeda = (v: number) => loading ? "…" : formatCurrency(v);
  const periodo = data.meses.length ? `${labelMes(data.meses[0])} — ${labelMes(data.meses[data.meses.length - 1])}` : "Sem histórico disponível";
  return (
    <section aria-labelledby="custo-inicio-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="custo-inicio-title" className="text-lg font-semibold">Custo de início de mês</h2><p className="text-xs text-muted-foreground">{periodo}{data.meses.length < n && data.meses.length > 0 ? ` · ${data.meses.length} meses disponíveis` : ""}</p></div>
        <div className="flex gap-1" role="group" aria-label="Período do custo de início de mês">
          {[3, 6, 12].map(v => <Button key={v} size="sm" variant={v === n ? "default" : "outline"} aria-pressed={v === n} onClick={() => setN(v)}>{v} meses</Button>)}
        </div>
      </div>
      <div className="border-l-4 border-primary bg-primary/5 px-4 py-3">
        <p className="text-sm text-muted-foreground">Total operacional médio/mês</p>
        <p className="text-2xl md:text-3xl font-bold tabular-nums text-primary break-words">{moeda(data.totalOperacional)}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {data.grupos.slice(0, 5).map((g, i) => <Button key={g.nome} variant="outline" disabled={loading || !data.meses.length} onClick={() => setDetalhe(i)} className="h-auto min-h-24 w-full items-start flex-col whitespace-normal text-left px-4 py-3">
          <span className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground"><span>{g.nome}</span><ChevronRight className="h-4 w-4 shrink-0" /></span>
          <span className="text-base font-semibold tabular-nums">{moeda(g.media)}</span>
        </Button>)}
      </div>
      <div className="border-t pt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        {data.grupos.slice(5).map((g, i) => <Button key={g.nome} variant="ghost" onClick={() => setDetalhe(i + 5)} disabled={loading || !data.meses.length} className="h-auto justify-start items-start flex-col whitespace-normal text-left px-0 hover:bg-transparent">
          <span className="text-xs text-muted-foreground">{g.nome} · média/mês</span><span className="font-semibold tabular-nums">{moeda(g.media)} <ChevronRight className="inline h-4 w-4" /></span>
        </Button>)}
        <div className="py-2"><p className="text-xs text-muted-foreground">Operacional + impostos + parcelas/mês</p><p className="font-bold tabular-nums">{moeda(data.totalAmpliado)}</p></div>
      </div>
      {data.semClassificar > 0 && <p className="text-xs text-warning-foreground">Saídas a classificar no período: {formatCurrency(data.semClassificar)}</p>}
      <Dialog open={grupo !== null} onOpenChange={open => { if (!open) setDetalhe(null); }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{grupo?.nome} — {periodo}</DialogTitle></DialogHeader>
          {grupo && <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Categoria</TableHead>{data.meses.map(m => <TableHead key={m} className="text-right whitespace-nowrap">{labelMes(m)}</TableHead>)}<TableHead className="text-right whitespace-nowrap">Média/mês</TableHead></TableRow></TableHeader>
            <TableBody>{grupo.categorias.map(c => <TableRow key={c.nome}><TableCell className="min-w-40">{c.nome}</TableCell>{c.valores.map(v => <TableCell key={v.mes} className="text-right tabular-nums whitespace-nowrap">{formatCurrency(v.valor)}</TableCell>)}<TableCell className="text-right tabular-nums whitespace-nowrap">{formatCurrency(c.media)}</TableCell></TableRow>)}
              <TableRow className="font-semibold"><TableCell>Total</TableCell>{grupo.valores.map(v => <TableCell key={v.mes} className="text-right tabular-nums whitespace-nowrap">{formatCurrency(v.valor)}</TableCell>)}<TableCell className="text-right tabular-nums whitespace-nowrap">{formatCurrency(grupo.media)}</TableCell></TableRow>
            </TableBody></Table></div>}
        </DialogContent>
      </Dialog>
    </section>
  );
}