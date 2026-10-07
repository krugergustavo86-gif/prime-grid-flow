import { useMemo, useState } from "react";
import { Transaction } from "@/types";
import { indicadoresCusto } from "@/utils/custoOperacional";
import { formatCurrency } from "@/utils/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const lbl = (k: string) => `${MESES[Number(k.slice(5)) - 1]}/${k.slice(2, 4)}`;
const pct = (n: number | null) => (n === null ? "—" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`);

export function CustoOperacionalCards({ transactions }: { transactions: Transaction[] }) {
  const [n, setN] = useState(6);
  const [open, setOpen] = useState(false);
  const ind = useMemo(() => indicadoresCusto(transactions, n), [transactions, n]);
  const periodo = `${lbl(ind.meses[0].key)} a ${lbl(ind.meses[n - 1].key)}`;
  const varOp = ind.custoOpMedio > 0 ? ind.atual.custoOp / ind.custoOpMedio - 1 : null;
  const varFixo = ind.custoFixoMedio > 0 ? ind.atual.custoFixo / ind.custoFixoMedio - 1 : null;

  const card = "bg-card rounded-lg border p-4 text-left hover:border-primary transition-colors";
  const tit = "text-[11px] font-medium uppercase tracking-wider text-muted-foreground";
  const val = "text-lg md:text-xl font-bold tabular-nums mt-1";

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Custos e equilíbrio</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Média de {periodo}</span>
          <div className="flex rounded-md border overflow-hidden">
            {[3, 6, 12].map(v => (
              <button key={v} onClick={() => setN(v)}
                className={`px-2.5 py-1 ${n === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{v}m</button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className={card} onClick={() => setOpen(true)}>
          <span className={tit}>Custo operacional médio/mês</span>
          <p className={`${val} text-chart-saida`}>{formatCurrency(ind.custoOpMedio)}</p>
          <p className="text-xs text-muted-foreground mt-1">Mês atual até hoje {formatCurrency(ind.atual.custoOp)} ({pct(varOp)} vs média)</p>
        </button>
        <button className={card} onClick={() => setOpen(true)}>
          <span className={tit}>Custo fixo médio/mês</span>
          <p className={`${val} text-chart-saida`}>{formatCurrency(ind.custoFixoMedio)}</p>
          <p className="text-xs text-muted-foreground mt-1">Mês atual até hoje {formatCurrency(ind.atual.custoFixo)} ({pct(varFixo)} vs média)</p>
        </button>
        <button className={card} onClick={() => setOpen(true)}>
          <span className={tit}>Ponto de equilíbrio/mês</span>
          <p className={val}>{ind.pontoEquilibrio === null ? "—" : formatCurrency(ind.pontoEquilibrio)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Receita op. média {formatCurrency(ind.receitaMedia)} · folga {pct(ind.folga)} · margem contrib. {ind.margemContrib === null ? "—" : `${(ind.margemContrib * 100).toFixed(1)}%`}
          </p>
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhe mês a mês por grupo ({periodo})</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Receita op.</TableHead>
                <TableHead className="text-right">Custo direto</TableHead>
                <TableHead className="text-right">Pessoal</TableHead>
                <TableHead className="text-right">Desp. operacionais</TableHead>
                <TableHead className="text-right">Custo fixo</TableHead>
                <TableHead className="text-right">Custo operacional</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...ind.meses, ind.atual].map((m, i) => (
                <TableRow key={m.key} className={i === n ? "text-muted-foreground italic" : ""}>
                  <TableCell>{lbl(m.key)}{i === n && " (atual, fora da média)"}</TableCell>
                  {[m.receita, m.custoDireto, m.pessoal, m.despOp, m.custoFixo, m.custoOp].map((v, j) => (
                    <TableCell key={j} className="text-right tabular-nums">{formatCurrency(v)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Média {n}m</TableCell>
                {[ind.receitaMedia, ind.custoDiretoMedio, ind.meses.reduce((s, m) => s + m.pessoal, 0) / n,
                  ind.meses.reduce((s, m) => s + m.despOp, 0) / n, ind.custoFixoMedio, ind.custoOpMedio].map((v, j) => (
                  <TableCell key={j} className="text-right tabular-nums">{formatCurrency(v)}</TableCell>
                ))}
              </TableRow>
            </TableFooter>
          </Table>
          <p className="text-xs text-muted-foreground">
            Fora do cálculo: Impostos, Financeiro, Investimentos/Patrimônio, Não operacional (inclui ajustes) e "A classificar".
            Ponto de equilíbrio = custo fixo médio ÷ margem de contribuição.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
