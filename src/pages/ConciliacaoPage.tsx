import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { useTodasContas } from "@/hooks/useContasBancarias";
import { saldosPorConta } from "@/utils/saldosContas";
import { formatCurrency, formatDateBR, MONTH_LABELS } from "@/utils/formatters";
import { getLockedMonthKeys, loadLockedMonths, useLockedMonthsVersion } from "@/utils/lockedMonths";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dataConferencia, saldoDigitado } from "@/utils/conferenciaMensal";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export default function ConciliacaoPage() {
  const { isAdmin, canManageLancamentos } = useAuth();
  const canEdit = isAdmin || canManageLancamentos;
  const { transactions, config, loading } = useTransactions();
  const { contas, reload } = useTodasContas();
  useLockedMonthsVersion();
  const [data, setData] = useState(today());
  const [mes, setMes] = useState(() => today().slice(0, 7));
  const [verHistorico, setVerHistorico] = useState(false);
  const [verFechamento, setVerFechamento] = useState(false);
  const [historico, setHistorico] = useState<{ id: string; conta_id: string; data: string; saldo_banco: number; saldo_sistema: number; diferenca: number; created_at: string }[]>([]);
  const [reais, setReais] = useState<Record<string, string>>({});
  const [ultimas, setUltimas] = useState<Record<string, { data: string; diferenca: number }>>({});
  const [busy, setBusy] = useState(false);

  const loadUltimas = async () => {
    const { data: rows, error } = await supabase.from("conciliacoes").select("id,conta_id,data,saldo_banco,saldo_sistema,diferenca,created_at")
      .order("data", { ascending: false }).order("created_at", { ascending: false });
    if (error) { toast.error("Não foi possível carregar o histórico"); return; }
    setHistorico((rows ?? []).map(r => ({ ...r, saldo_banco: Number(r.saldo_banco), saldo_sistema: Number(r.saldo_sistema), diferenca: Number(r.diferenca) })));
    const m: typeof ultimas = {};
    for (const r of rows ?? []) if (!m[r.conta_id]) m[r.conta_id] = { data: r.data, diferenca: Number(r.diferenca) };
    setUltimas(m);
  };
  useEffect(() => { void loadUltimas(); }, []);

  // Lançamentos feitos depois da conciliação com data anterior a ela (mês aberto)
  const [pendAjuste, setPendAjuste] = useState<{ id: string; date: string; description: string; type: string; value: number }[]>([]);
  const loadPend = async () => {
    const { data: rows } = await supabase.rpc("lancamentos_pos_conciliacao");
    setPendAjuste((rows ?? []).map(r => ({ ...r, value: Number(r.value) })));
  };
  useEffect(() => { void loadPend(); }, []);
  const netPend = pendAjuste.reduce((s, t) => s + (t.type === "Entrada" ? t.value : -t.value), 0);
  const recalcular = async () => {
    if (!window.confirm(`Confirme somente se esses lançamentos já estavam incluídos no saldo bancário da última conferência. O ajuste será recalculado em ${formatCurrency(netPend)}; isso altera o saldo calculado hoje para eliminar a duplicação. Continuar?`)) return;
    setBusy(true);
    const { data: novo, error } = await supabase.rpc("recalcular_ajuste_conciliacao");
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Ajuste recalculado: ${formatCurrency(Number(novo))}`);
    setTimeout(() => window.location.reload(), 600);
  };

  const sistema = useMemo(() => saldosPorConta(contas, transactions, config.saldoAnterior, data),
    [contas, transactions, config.saldoAnterior, data]);

  const linhas = contas.map(c => {
    const real = c.historico ? 0 : saldoDigitado(reais[c.id] ?? "");
    const sys = sistema[c.id] ?? 0;
    return { c, real, sys, diff: real === null ? null : Math.round((real - sys) * 100) / 100 };
  });
  const completas = linhas.length > 0 && !loading && linhas.every(l => l.real !== null);
  const preenchidas = linhas.filter(l => !l.c.historico && l.real !== null).length;
  const divergentes = linhas.filter(l => l.diff !== null && Math.abs(l.diff) >= 0.005).length;
  const totSys = linhas.reduce((s, l) => s + l.sys, 0);
  const totReal = linhas.reduce((s, l) => s + (l.real ?? 0), 0);
  const totDiff = Math.round((totReal - totSys) * 100) / 100;

  const gerarAjuste = async () => {
    if (!completas) { toast.error("Informe o saldo real de todas as contas"); return; }
    if (!window.confirm(`Salvar conferência de ${formatDateBR(data)}? ${Math.abs(totDiff) < 0.005 ? "Sem novo lançamento de ajuste." : `Será criado UM ajuste ${totDiff > 0 ? "de entrada" : "de saída"} de ${formatCurrency(Math.abs(totDiff))}.`} Os saldos de abertura das contas serão atualizados com os saldos informados.`)) return;
    setBusy(true);
    const saldos = linhas.map(l => ({ conta_id: l.c.id, saldo_banco: l.real, saldo_sistema: l.sys }));
    const { error } = await supabase.rpc("aplicar_conciliacao", { _data: data, _saldos: saldos, _diferenca: totDiff });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Conciliação aplicada");
    setTimeout(() => window.location.reload(), 600);
  };

  // Fechamento mensal
  const locked = new Set(getLockedMonthKeys());
  const months = MONTH_LABELS.map((label, i) => ({ key: `${String(i + 1).padStart(2, "0")}/${config.ano}`, label }));
  const fechar = async (k: string) => {
    const { error } = await supabase.rpc("fechar_mes", { _month: k });
    if (error) { toast.error(error.message); return; }
    await loadLockedMonths(); toast.success(`Mês ${k} fechado`);
  };
  const reabrir = async (k: string) => {
    if (!window.confirm(`Reabrir ${k}? Ficará registrado em Atividades.`)) return;
    const { error } = await supabase.rpc("reabrir_mes", { _month: k });
    if (error) { toast.error(error.message); return; }
    await loadLockedMonths(); toast.success(`Mês ${k} reaberto`);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Conferência mensal de contas" />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 space-y-6">
        {pendAjuste.length > 0 && (
          <div className="border border-destructive/40 bg-destructive/5 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">
              {pendAjuste.length} lançamento(s) feitos depois da última conciliação com data anterior a ela ({formatCurrency(netPend)} líquido).
              Verifique se já estavam incluídos nos saldos bancários usados naquela conferência antes de recalcular.
            </p>
            <ul className="text-xs text-muted-foreground">
              {pendAjuste.slice(0, 10).map(t => <li key={t.id}>{formatDateBR(t.date)} · {t.description} · {t.type === "Entrada" ? "+" : "−"}{formatCurrency(t.value)}</li>)}
            </ul>
            {canEdit && <Button size="sm" onClick={recalcular} disabled={busy}>Recalcular ajuste</Button>}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div><Label>Mês da conferência</Label><Select value={mes} onValueChange={m => { setMes(m); setData(dataConferencia(m, today())); setReais({}); }}><SelectTrigger aria-label="Mês da conferência" className="mt-1 w-44"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 12 }, (_, i) => { const d = new Date(`${today()}T12:00:00`); d.setDate(1); d.setMonth(d.getMonth() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; return <SelectItem key={k} value={k}>{d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</SelectItem>; })}</SelectContent></Select></div>
          <div>
            <Label>Data do saldo do banco</Label>
            <Input aria-label="Data do saldo do banco" type="date" min={`${mes}-01`} max={dataConferencia(mes, today())} className="mt-1 w-44" value={data} onChange={e => { setData(e.target.value); setReais({}); }} />
          </div>
          {canEdit && (
            <Button onClick={gerarAjuste} disabled={busy || !completas || !data}>Salvar conferência</Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-y py-3">
          <div><p className="text-xs text-muted-foreground">Saldo do sistema</p><p className="font-semibold tabular-nums">{loading ? "…" : formatCurrency(totSys)}</p></div>
          <div><p className="text-xs text-muted-foreground">Saldo informado no banco</p><p className="font-semibold tabular-nums">{completas ? formatCurrency(totReal) : `${preenchidas}/${contas.filter(c => !c.historico).length} contas informadas`}</p></div>
          <div><p className="text-xs text-muted-foreground">Diferença total</p><p className={`font-semibold tabular-nums ${completas && totDiff !== 0 ? "text-destructive" : "text-foreground"}`}>{completas ? formatCurrency(totDiff) : "—"}</p><p className="text-xs text-muted-foreground">{divergentes} conta(s) com diferença</p></div>
        </div>

        <div className="bg-card border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs uppercase">
              <tr className="border-b">
                <th className="text-left p-3">Conta</th>
                <th className="text-right p-3">Saldo sistema</th>
                <th className="text-right p-3">Saldo banco</th>
                <th className="text-right p-3">Diferença</th>
                <th className="text-left p-3">Última conciliação</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ c, sys, diff }) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3">
                    {c.nome}
                    {c.tipo === "investimento" && <Badge variant="secondary" className="ml-2">Investimento · resgate diário</Badge>}
                  </td>
                  <td className="p-3 text-right tabular-nums">{formatCurrency(sys)}</td>
                  <td className="p-3 text-right">
                    {c.historico ? <span className="tabular-nums text-muted-foreground">{formatCurrency(0)}</span> : (
                      <Input aria-label={`Saldo banco ${c.nome}`} inputMode="decimal" className="w-36 ml-auto text-right tabular-nums" placeholder="0,00" disabled={!canEdit}
                        value={reais[c.id] ?? ""} onChange={e => setReais(r => ({ ...r, [c.id]: e.target.value }))} />
                    )}
                  </td>
                  <td className={`p-3 text-right tabular-nums ${diff && Math.abs(diff) >= 0.005 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {diff === null ? "—" : formatCurrency(diff)}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {ultimas[c.id] ? `${formatDateBR(ultimas[c.id].data)} · dif. ${formatCurrency(ultimas[c.id].diferenca)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td className="p-3">Total</td>
                <td className="p-3 text-right tabular-nums">{formatCurrency(totSys)}</td>
                <td className="p-3 text-right tabular-nums">{completas ? formatCurrency(totReal) : "—"}</td>
                <td className="p-3 text-right tabular-nums">{completas ? formatCurrency(totDiff) : "—"}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" aria-expanded={verHistorico} onClick={() => setVerHistorico(v => !v)}>Histórico de conferências ({new Set(historico.map(r => r.data)).size})</Button>
          <Button variant="outline" aria-expanded={verFechamento} onClick={() => setVerFechamento(v => !v)}>Fechamento mensal</Button>
        </div>
        {verHistorico && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Data</th><th className="p-3">Conta</th><th className="p-3 text-right">Sistema registrado</th><th className="p-3 text-right">Banco registrado</th><th className="p-3 text-right">Diferença registrada</th></tr></thead><tbody>{historico.map(r => <tr key={r.id} className="border-b"><td className="p-3 whitespace-nowrap">{formatDateBR(r.data)}</td><td className="p-3">{contas.find(c => c.id === r.conta_id)?.nome ?? "Conta do histórico"}</td><td className="p-3 text-right tabular-nums whitespace-nowrap">{formatCurrency(r.saldo_sistema)}</td><td className="p-3 text-right tabular-nums whitespace-nowrap">{formatCurrency(r.saldo_banco)}</td><td className="p-3 text-right tabular-nums whitespace-nowrap">{formatCurrency(r.diferenca)}</td></tr>)}</tbody></table>{!historico.length && <p className="text-sm text-muted-foreground p-3">Nenhuma conferência registrada.</p>}</div>}
        {verFechamento && <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Fechamento mensal {config.ano}</h2>
          <p className="text-xs text-muted-foreground mb-3">O mês só fecha com diferença zero em todas as contas (conciliação na data final do mês ou depois). Só Admin reabre.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {months.map(m => {
              const isL = locked.has(m.key);
              return (
                <div key={m.key} className="bg-card border rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    {isL ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3 text-muted-foreground" />}{m.label}
                  </div>
                  {isL ? (
                    isAdmin ? <Button size="sm" variant="outline" onClick={() => reabrir(m.key)}>Reabrir</Button>
                      : <span className="text-xs text-muted-foreground">Fechado</span>
                  ) : canEdit ? <Button size="sm" onClick={() => fechar(m.key)}>Fechar</Button>
                    : <span className="text-xs text-muted-foreground">Aberto</span>}
                </div>
              );
            })}
          </div>
        </div>}
      </div>
    </div>
  );
}
