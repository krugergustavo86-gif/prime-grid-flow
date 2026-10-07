import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { custosPorMes, mesKey } from "@/utils/custoOperacional";
import { formatCurrency } from "@/utils/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OS { numero: string; cliente: string | null; area: string | null; status: string | null; data_abertura: string | null; data_execucao: string | null; valor: number | null }

const AREAS = ["ADM Geral", "Caminhão/Redes", "Técnica", "Geradores", "Emergência", "Solar/Projetos"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const lbl = (k: string) => `${MESES[Number(k.slice(5)) - 1]}/${k.slice(0, 4)}`;
const addM = (k: string, d: number) => mesKey(new Date(Number(k.slice(0, 4)), Number(k.slice(5)) - 1 + d, 1));
const dias = (a: string, b: string) => Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
const cancelada = (o: OS) => /cancel/i.test(o.status ?? "");
const pct = (n: number | null) => (n === null ? "—" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`);

export function OperacaoOS({ transactions }: { transactions: Transaction[] }) {
  const [ordens, setOrdens] = useState<OS[] | null>(null);
  const [mes, setMes] = useState(() => addM(mesKey(new Date()), -1));
  const [area, setArea] = useState("Todas");

  useEffect(() => {
    let alive = true;
    (async () => {
      const all: OS[] = [];
      for (let from = 0; from < 100000; from += 1000) {
        const { data } = await supabase.from("ordens_servico").select("numero,cliente,area,status,data_abertura,data_execucao,valor").order("numero").range(from, from + 999);
        if (!data) break;
        all.push(...(data as OS[]));
        if (data.length < 1000) break;
      }
      if (alive) setOrdens(all);
    })();
    return () => { alive = false; };
  }, []);

  const recebidas = useMemo(() => {
    const s = new Set<string>();
    for (const t of transactions) {
      if (t.type !== "Entrada") continue;
      const m = (t.notes ?? "").match(/OS:\s*([^\s|]+)/) ?? t.description.match(/OS #(\S+)/);
      if (m) s.add(m[1]);
    }
    return s;
  }, [transactions]);

  const custos = useMemo(() => custosPorMes(transactions), [transactions]);

  const calc = (k: string) => {
    const fim = `${k}-31`;
    const base = (ordens ?? []).filter(o => !cancelada(o));
    const daArea = area === "Todas" ? base : base.filter(o => o.area === area);
    const abertas = daArea.filter(o => o.data_abertura?.startsWith(k));
    const exec = daArea.filter(o => o.data_execucao?.startsWith(k));
    const backlog = daArea.filter(o => o.data_abertura && o.data_abertura <= fim && (!o.data_execucao || o.data_execucao > fim));
    const ref = k === mesKey(new Date()) ? new Date().toISOString().slice(0, 10) : new Date(Number(k.slice(0, 4)), Number(k.slice(5)), 0).toISOString().slice(0, 10);
    const backlog30 = backlog.filter(o => dias(o.data_abertura!, ref) > 30).length;
    const receita = exec.reduce((s, o) => s + (o.valor ?? 0), 0);
    const ticket = exec.length ? receita / exec.length : null;
    const c = custos[k];
    // Custo por OS: sempre sobre todas as OS executadas (o custo não é separado por área).
    const execTodas = base.filter(o => o.data_execucao?.startsWith(k)).length;
    const custoMes = c ? c.custoOp - c.kits : 0;
    const custoOS = execTodas ? custoMes / execTodas : null;
    const tempos = exec.filter(o => o.data_abertura).map(o => dias(o.data_abertura!, o.data_execucao!));
    const tempo = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null;
    return { abertas: abertas.length, exec, backlog: backlog.length, backlog30, ticket, custoOS, tempo,
      taxa: abertas.length ? exec.length / abertas.length : null };
  };

  const r = useMemo(() => calc(mes), [ordens, mes, area, custos]); // eslint-disable-line react-hooks/exhaustive-deps
  const ant = useMemo(() => calc(addM(mes, -1)), [ordens, mes, area, custos]); // eslint-disable-line react-hooks/exhaustive-deps
  const media6 = useMemo(() => {
    const ts = [1, 2, 3, 4, 5, 6].map(i => calc(addM(mes, -i)).ticket).filter((v): v is number => v !== null);
    return ts.length ? ts.reduce((a, b) => a + b, 0) / ts.length : null;
  }, [ordens, mes, area, custos]); // eslint-disable-line react-hooks/exhaustive-deps
  const porArea = useMemo(() => AREAS.map(a => {
    const ex = (ordens ?? []).filter(o => !cancelada(o) && o.area === a && o.data_execucao?.startsWith(mes));
    return { a, n: ex.length, t: ex.length ? ex.reduce((s, o) => s + (o.valor ?? 0), 0) / ex.length : null };
  }), [ordens, mes]);
  const semReceb = useMemo(() => (ordens ?? [])
    .filter(o => !cancelada(o) && o.data_execucao && (area === "Todas" || o.area === area) && !recebidas.has(o.numero))
    .map(o => ({ ...o, d: dias(o.data_execucao!, new Date().toISOString().slice(0, 10)) }))
    .sort((a, b) => b.d - a.d), [ordens, area, recebidas]);

  const meses = Array.from({ length: 12 }, (_, i) => addM(mesKey(new Date()), -i));
  const card = "bg-card rounded-lg border p-4";
  const tit = "text-[11px] font-medium uppercase tracking-wider text-muted-foreground";
  const val = "text-lg md:text-xl font-bold tabular-nums mt-1";
  const margem = r.ticket !== null && r.custoOS !== null ? r.ticket - r.custoOS : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Operação / OS</h2>
        <div className="flex gap-2">
          <select value={mes} onChange={e => setMes(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
            {meses.map(k => <option key={k} value={k}>{lbl(k)}</option>)}
          </select>
          <select value={area} onChange={e => setArea(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
            {["Todas", ...AREAS].map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {ordens !== null && ordens.length === 0 ? (
        <div className={`${card} text-sm text-muted-foreground`}>
          Aguardando dados de OS do OPS. Hoje o Cash só recebe recebimentos/boletos com o número da OS; status, área e datas de abertura e execução chegam quando o OPS começar a enviar os eventos de OS.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${card} md:row-span-2 border-primary`}>
              <span className={tit}>Ticket médio por OS</span>
              <p className="text-2xl md:text-3xl font-bold tabular-nums mt-1 text-primary">{r.ticket === null ? "—" : formatCurrency(r.ticket)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Mês anterior {ant.ticket === null ? "—" : formatCurrency(ant.ticket)} ({pct(r.ticket && ant.ticket ? r.ticket / ant.ticket - 1 : null)})
                {" · "}Média 6m {media6 === null ? "—" : formatCurrency(media6)}
              </p>
              <div className="mt-3 space-y-1 text-xs">
                {porArea.map(p => (
                  <div key={p.a} className="flex justify-between"><span>{p.a} ({p.n})</span><span className="tabular-nums">{p.t === null ? "—" : formatCurrency(p.t)}</span></div>
                ))}
              </div>
            </div>
            <div className={card}><span className={tit}>Abertas / Executadas</span>
              <p className={val}>{r.abertas} / {r.exec.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Taxa de execução {r.taxa === null ? "—" : `${(r.taxa * 100).toFixed(0)}%`}</p></div>
            <div className={card}><span className={tit}>Backlog</span>
              <p className={val}>{r.backlog}</p>
              <p className="text-xs text-muted-foreground mt-1">{r.backlog30} abertas há mais de 30 dias</p></div>
            <div className={card}><span className={tit}>Custo médio / margem por OS</span>
              <p className={val}>{r.custoOS === null ? "—" : formatCurrency(r.custoOS)}</p>
              <p className="text-xs text-muted-foreground mt-1">Margem média {margem === null ? "—" : formatCurrency(margem)} · custo operacional sem Kits Solar/BESS</p></div>
            <div className={card}><span className={tit}>Tempo abertura → execução</span>
              <p className={val}>{r.tempo === null ? "—" : `${r.tempo.toFixed(1)} dias`}</p></div>
          </div>
          <div className={`${card} mt-4`}>
            <span className={tit}>OS executadas sem recebimento lançado ({semReceb.length})</span>
            <div className="max-h-72 overflow-y-auto mt-2">
              <Table>
                <TableHeader><TableRow><TableHead>OS</TableHead><TableHead>Cliente</TableHead><TableHead>Área</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Dias</TableHead></TableRow></TableHeader>
                <TableBody>
                  {semReceb.map(o => (
                    <TableRow key={o.numero}><TableCell>{o.numero}</TableCell><TableCell>{o.cliente}</TableCell><TableCell>{o.area}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(o.valor ?? 0)}</TableCell><TableCell className="text-right tabular-nums">{o.d}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
