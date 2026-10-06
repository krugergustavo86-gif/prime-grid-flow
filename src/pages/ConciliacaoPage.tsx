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
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

const parseBR = (s: string) => {
  const c = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return c === "" ? null : Number(c);
};
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export default function ConciliacaoPage() {
  const { isAdmin, canManageLancamentos } = useAuth();
  const canEdit = isAdmin || canManageLancamentos;
  const { transactions, config } = useTransactions();
  const { contas, reload } = useTodasContas();
  useLockedMonthsVersion();
  const [data, setData] = useState(today());
  const [reais, setReais] = useState<Record<string, string>>({});
  const [ultimas, setUltimas] = useState<Record<string, { data: string; diferenca: number }>>({});
  const [busy, setBusy] = useState(false);

  const loadUltimas = async () => {
    const { data: rows } = await supabase.from("conciliacoes").select("conta_id,data,diferenca,created_at")
      .order("data", { ascending: false }).order("created_at", { ascending: false });
    const m: typeof ultimas = {};
    for (const r of rows ?? []) if (!m[r.conta_id]) m[r.conta_id] = { data: r.data, diferenca: Number(r.diferenca) };
    setUltimas(m);
  };
  useEffect(() => { void loadUltimas(); }, []);

  const sistema = useMemo(() => saldosPorConta(contas, transactions, config.saldoAnterior, data),
    [contas, transactions, config.saldoAnterior, data]);

  const linhas = contas.map(c => {
    const real = c.historico ? 0 : parseBR(reais[c.id] ?? "");
    const sys = sistema[c.id] ?? 0;
    return { c, real, sys, diff: real === null ? null : Math.round((real - sys) * 100) / 100 };
  });
  const completas = linhas.every(l => l.real !== null);
  const totSys = linhas.reduce((s, l) => s + l.sys, 0);
  const totReal = linhas.reduce((s, l) => s + (l.real ?? 0), 0);
  const totDiff = Math.round((totReal - totSys) * 100) / 100;

  const gerarAjuste = async () => {
    if (!completas) { toast.error("Informe o saldo real de todas as contas"); return; }
    if (!window.confirm(`Gerar UM lançamento "Ajuste de conciliação" de ${formatCurrency(totDiff)} em ${formatDateBR(data)} e iniciar cada conta com o saldo real?`)) return;
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
      <Header title="Conciliação bancária" />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Data do saldo do banco</Label>
            <Input type="date" className="mt-1 w-44" value={data} onChange={e => setData(e.target.value)} />
          </div>
          {canEdit && (
            <Button onClick={gerarAjuste} disabled={busy || !completas}>Gerar ajuste de conciliação</Button>
          )}
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
                      <Input className="w-36 ml-auto text-right tabular-nums" placeholder="0,00" disabled={!canEdit}
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

        <div>
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
        </div>
      </div>
    </div>
  );
}
