import { useMemo } from "react";
import { usePatrimony } from "@/hooks/usePatrimony";
import { usePatrimonyKPIs } from "@/hooks/usePatrimonyKPIs";
import { useTransactions } from "@/hooks/useTransactions";
import { useAnnualSummary } from "@/hooks/useAnnualSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/utils/formatters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#A32D2D", "#0F6E56", "#1F3864", "#D46A6A", "#25A686", "#3B6FA0", "#E08888", "#4DD4B0", "#5B8DCE", "#CC6633"];

function Kpi({ title, value, color = "text-foreground" }: { title: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className={`text-lg md:text-xl font-bold tabular-nums ${color}`}>{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  );
}

interface Props {
  periodTotals?: { entradas: number; saidas: number; lucro: number };
}

export function PatrimonialReportSection({ periodTotals }: Props = {}) {
  const { transactions, config } = useTransactions();
  const { caixaAtual } = useAnnualSummary(transactions, config.saldoAnterior, config.ano);
  const patrimony = usePatrimony();
  const kpis = usePatrimonyKPIs(patrimony, config.numSocios, caixaAtual);
  const { assets, receivables, doubtfulCredits, loans, payables } = patrimony;

  // Composição patrimonial
  const compAssets = useMemo(() => {
    const m: Record<string, number> = {};
    assets.forEach(a => { m[a.group] = (m[a.group] || 0) + a.valueMarket; });
    const arr = Object.entries(m).map(([name, value]) => ({ name, value }));
    arr.push({ name: "Caixa/Invest.", value: kpis.cashAvailable });
    arr.push({ name: "A Receber", value: kpis.totalReceivables });
    return arr.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [assets, kpis]);

  // Empréstimos
  const loanStats = useMemo(() => {
    let totalParcelas = 0, parcelasRest = 0, valorPago = 0, valorRest = 0;
    loans.forEach(l => {
      totalParcelas += l.totalInstallments;
      parcelasRest += (l.totalInstallments - l.paidInstallments);
      valorPago += l.paidInstallments * l.installmentValue;
      valorRest += (l.totalInstallments - l.paidInstallments) * l.installmentValue;
    });
    return { totalParcelas, parcelasRest, valorPago, valorRest };
  }, [loans]);

  const proximosVencimentos = useMemo(() => {
    return [...loans]
      .filter(l => l.nextPayment)
      .sort((a, b) => (a.nextPayment || "").localeCompare(b.nextPayment || ""))
      .slice(0, 5);
  }, [loans]);

  // Payables breakdown
  const today = new Date().toISOString().slice(0, 10);
  const payableStats = useMemo(() => {
    const pend = payables.filter(p => p.status !== "Pago");
    const vencidas = pend.filter(p => p.dueDate && p.dueDate < today);
    const aVencer = pend.filter(p => !p.dueDate || p.dueDate >= today);
    const totalVencidas = vencidas.reduce((s, p) => s + p.value, 0);
    const totalAVencer = aVencer.reduce((s, p) => s + p.value, 0);
    const porResp: Record<string, number> = {};
    pend.forEach(p => { porResp[p.responsible || "—"] = (porResp[p.responsible || "—"] || 0) + p.value; });
    return {
      vencidas, aVencer, totalVencidas, totalAVencer,
      porResp: Object.entries(porResp).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    };
  }, [payables, today]);

  // Receivables breakdown
  const receivableStats = useMemo(() => {
    const pend = receivables.filter(r => r.status !== "Recebido");
    const vencidas = pend.filter(r => r.dueDate && r.dueDate < today);
    const aVencer = pend.filter(r => !r.dueDate || r.dueDate >= today);
    const open = (r: typeof receivables[number]) => Math.max(0, r.value - (r.paidValue ?? 0));
    const totalVencidas = vencidas.reduce((s, r) => s + open(r), 0);
    const totalAVencer = aVencer.reduce((s, r) => s + open(r), 0);
    const porCliente: Record<string, number> = {};
    pend.forEach(r => { porCliente[r.responsible || r.description] = (porCliente[r.responsible || r.description] || 0) + open(r); });
    return {
      vencidas, aVencer, totalVencidas, totalAVencer,
      porCliente: Object.entries(porCliente).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
    };
  }, [receivables, today]);

  const totalDuvidosos = doubtfulCredits.reduce((s, d) => s + d.value, 0);

  const ativoTotal = kpis.grossPatrimony;
  const passivoTotal = kpis.totalAPagar;
  const patrimonioLiquido = kpis.netPatrimony;

  return (
    <div className="space-y-4 mt-6 pt-6 border-t-2 border-border">
      <h2 className="text-xl font-bold text-foreground">Visão Patrimonial Completa</h2>

      {/* Resumo Patrimonial */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Resumo Patrimonial (Ativo vs Passivo)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Kpi title="Ativo Total" value={ativoTotal} color="text-chart-entrada" />
          <Kpi title="Passivo Total" value={passivoTotal} color="text-chart-saida" />
          <Kpi title="Patrimônio Líquido" value={patrimonioLiquido} color={patrimonioLiquido >= 0 ? "text-chart-entrada" : "text-chart-saida"} />
        </CardContent>
      </Card>

      {/* Patrimônio */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Patrimônio — Ativos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi title="Patrimônio Bruto" value={kpis.grossPatrimony} />
            <Kpi title="Total Ativos" value={kpis.totalAssets} />
            <Kpi title="Caixa/Invest." value={kpis.cashAvailable} />
            <Kpi title="Por Sócio" value={kpis.perPartner} />
          </div>
          {compAssets.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={compAssets} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                  {compAssets.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead className="text-right">FIPE</TableHead>
                <TableHead className="text-right">Valor Mercado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem ativos</TableCell></TableRow>
              ) : assets.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.description}</TableCell>
                  <TableCell>{a.group}</TableCell>
                  <TableCell>{a.plate || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.valueFipe ? formatCurrency(a.valueFipe) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(a.valueMarket)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Empréstimos */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Empréstimos & Financiamentos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi title="Saldo Devedor" value={kpis.totalLoanBalance} color="text-chart-saida" />
            <Kpi title="Valor Pago" value={loanStats.valorPago} color="text-chart-entrada" />
            <Kpi title="Parcelas Pendentes" value={loanStats.parcelasRest} />
            <Kpi title="Contratos Ativos" value={loans.length} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Instituição</TableHead>
                <TableHead className="text-right">Parcelas</TableHead>
                <TableHead className="text-right">Valor Parcela</TableHead>
                <TableHead className="text-right">Saldo Devedor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem empréstimos</TableCell></TableRow>
              ) : loans.map(l => {
                const rest = l.totalInstallments - l.paidInstallments;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.contract}</TableCell>
                    <TableCell>{l.institution}</TableCell>
                    <TableCell className="text-right">{l.paidInstallments}/{l.totalInstallments}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(l.installmentValue)}</TableCell>
                    <TableCell className="text-right tabular-nums text-chart-saida">{formatCurrency(rest * l.installmentValue)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {proximosVencimentos.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Próximos Vencimentos</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proximosVencimentos.map(l => (
                    <TableRow key={l.id}>
                      <TableCell>{l.nextPayment}</TableCell>
                      <TableCell>{l.contract}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(l.installmentValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contas a Pagar */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Contas a Pagar</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Kpi title="Total Pendente" value={payableStats.totalVencidas + payableStats.totalAVencer} />
            <Kpi title="Vencidas" value={payableStats.totalVencidas} color="text-chart-saida" />
            <Kpi title="A Vencer" value={payableStats.totalAVencer} />
          </div>
          {payableStats.porResp.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={payableStats.porResp}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="#A32D2D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payables.filter(p => p.status !== "Pago").length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem contas pendentes</TableCell></TableRow>
              ) : payables.filter(p => p.status !== "Pago").map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.description}</TableCell>
                  <TableCell>{p.responsible || "—"}</TableCell>
                  <TableCell>{p.dueDate || "—"}</TableCell>
                  <TableCell>{p.status}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(p.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contas a Receber */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Contas a Receber</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Kpi title="Total a Receber" value={receivableStats.totalVencidas + receivableStats.totalAVencer} color="text-chart-entrada" />
            <Kpi title="Vencidas" value={receivableStats.totalVencidas} color="text-chart-saida" />
            <Kpi title="A Vencer" value={receivableStats.totalAVencer} />
          </div>
          {receivableStats.porCliente.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={receivableStats.porCliente} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="#0F6E56" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Créditos Duvidosos */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Créditos Duvidosos (Provisão)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Kpi title="Total Provisionado" value={totalDuvidosos} color="text-chart-saida" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doubtfulCredits.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem créditos duvidosos</TableCell></TableRow>
              ) : doubtfulCredits.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.description}</TableCell>
                  <TableCell>{d.responsible || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(d.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
