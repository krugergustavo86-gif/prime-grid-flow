import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Transaction, Loan } from "@/types";
import { formatCurrency, formatCurrencyShort, MONTH_LABELS_SHORT } from "@/utils/formatters";
import { TrendingUp, Calendar, Wallet, Lightbulb, RotateCcw } from "lucide-react";

interface Props {
  transactions: Transaction[];
  loans: Loan[];
  netPatrimony: number;
  totalDebt: number;
  cashAvailable: number;
}

const PROJECTION_MONTHS = 12;

function detectPayroll(transactions: Transaction[]): number {
  // Try to detect average monthly payroll from "Folha" category in last 3 months
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recent = transactions.filter(t => {
    const d = new Date(t.date + "T12:00:00");
    return d >= cutoff && t.category.toLowerCase().includes("folha");
  });
  if (recent.length === 0) return 209000;
  const total = recent.reduce((s, t) => s + t.value, 0);
  const monthly = total / 3;
  return monthly > 1000 ? Math.round(monthly) : 209000;
}

function computeMonthlyAverages(transactions: Transaction[]) {
  // Use last 6 months (excluding current) for averages
  const now = new Date();
  const buckets = new Map<string, { entradas: number; saidas: number; folha: number; emprestimos: number }>();
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    buckets.set(key, { entradas: 0, saidas: 0, folha: 0, emprestimos: 0 });
  }
  for (const t of transactions) {
    const b = buckets.get(t.month);
    if (!b) continue;
    if (t.type === "Entrada") b.entradas += t.value;
    else {
      b.saidas += t.value;
      const cat = t.category.toLowerCase();
      if (cat.includes("folha")) b.folha += t.value;
      if (cat.includes("emprésti") || cat.includes("emprest") || cat.includes("financiamento")) b.emprestimos += t.value;
    }
  }
  const arr = Array.from(buckets.values());
  const n = arr.length || 1;
  const avgEntradas = arr.reduce((s, v) => s + v.entradas, 0) / n;
  const avgSaidas = arr.reduce((s, v) => s + v.saidas, 0) / n;
  const avgFolha = arr.reduce((s, v) => s + v.folha, 0) / n;
  const avgEmprestimos = arr.reduce((s, v) => s + v.emprestimos, 0) / n;
  return { avgEntradas, avgSaidas, avgFolha, avgEmprestimos };
}

export function ProjectionsTab({ transactions, loans, netPatrimony, totalDebt, cashAvailable }: Props) {
  const baseline = useMemo(() => computeMonthlyAverages(transactions), [transactions]);
  const detectedPayroll = useMemo(() => {
    const fromCategory = baseline.avgFolha;
    return fromCategory > 1000 ? Math.round(fromCategory) : detectPayroll(transactions);
  }, [transactions, baseline.avgFolha]);

  const baseRevenue = Math.round(baseline.avgEntradas) || 0;
  const baseOtherExpenses = Math.max(
    0,
    Math.round(baseline.avgSaidas - baseline.avgFolha - baseline.avgEmprestimos),
  );
  const baseLoanPayments = Math.round(baseline.avgEmprestimos) || 0;

  // Simulator state
  const [payroll, setPayroll] = useState(detectedPayroll);
  const [revenue, setRevenue] = useState(baseRevenue);
  const [reduction, setReduction] = useState(0); // additional expense reduction (positive = save)
  const [otherExpenses, setOtherExpenses] = useState(baseOtherExpenses);

  // New loan simulator
  const [newLoanValue, setNewLoanValue] = useState(0);
  const [newLoanRate, setNewLoanRate] = useState(2); // % per month
  const [newLoanTerm, setNewLoanTerm] = useState(24);

  // Early payoff
  const [payoffLoanId, setPayoffLoanId] = useState<string>("none");

  const reset = () => {
    setPayroll(detectedPayroll);
    setRevenue(baseRevenue);
    setReduction(0);
    setOtherExpenses(baseOtherExpenses);
    setNewLoanValue(0);
    setNewLoanRate(2);
    setNewLoanTerm(24);
    setPayoffLoanId("none");
  };

  // Compute loans schedule (months ahead)
  const loanSchedule = useMemo(() => {
    return loans.map(l => {
      const monthsRemaining = Math.max(0, l.totalInstallments - l.paidInstallments);
      const monthlyPayment = l.installmentValue;
      return { id: l.id, contract: l.contract, monthsRemaining, monthlyPayment };
    });
  }, [loans]);

  // For each future month i (1..12), sum loan installments still being paid
  const loanPaymentsByMonth = useMemo(() => {
    const arr: number[] = [];
    for (let i = 1; i <= PROJECTION_MONTHS; i++) {
      let total = 0;
      for (const l of loanSchedule) {
        if (i <= l.monthsRemaining) total += l.monthlyPayment;
      }
      arr.push(total);
    }
    return arr;
  }, [loanSchedule]);

  // New loan installment (Price-style approximation)
  const newLoanInstallment = useMemo(() => {
    if (newLoanValue <= 0 || newLoanTerm <= 0) return 0;
    const i = newLoanRate / 100;
    if (i === 0) return newLoanValue / newLoanTerm;
    return (newLoanValue * i * Math.pow(1 + i, newLoanTerm)) / (Math.pow(1 + i, newLoanTerm) - 1);
  }, [newLoanValue, newLoanRate, newLoanTerm]);

  // Build projection
  const chartData = useMemo(() => {
    const now = new Date();
    const data: { label: string; atual: number; simulado: number }[] = [];

    // Baseline scenario monthly net delta = avgEntradas - avgSaidas (no changes)
    // BUT loan installments paid don't change net equity (cash↓, debt↓ cancel).
    // So net equity monthly change ≈ revenue - (saidas - loanPayments)
    const baselineMonthlyNet = baseline.avgEntradas - (baseline.avgSaidas - baseline.avgEmprestimos);

    // Simulated scenario monthly base
    const simulatedOpExpenses = payroll + otherExpenses - reduction;
    const simulatedMonthlyNet = revenue - simulatedOpExpenses;

    // New loan: increases gross (cash) by value once, increases debt by value.
    // Net effect at month 0: 0. Then each month installment paid: cash↓ by inst, debt↓ by principal portion.
    // Simplification: new loan adds extra installment expense AFTER receiving (net effect on equity ≈ -interest portion).
    // We'll add full installment as extra expense for term months, and add principal back as it's paid (net-zero principal).
    // Approximation: subtract interest only.
    let newLoanRemaining = newLoanValue;
    const newLoanMonthlyInterest = newLoanRate / 100;

    // Early payoff: at month 1 reduces both cash and debt by remaining balance → net 0,
    // but eliminates future installments → frees cash flow. We model by removing those installments from sim.
    const payoffLoan = loans.find(l => l.id === payoffLoanId);
    const payoffMonthsRemaining = payoffLoan ? Math.max(0, payoffLoan.totalInstallments - payoffLoan.paidInstallments) : 0;
    const payoffInstallment = payoffLoan?.installmentValue ?? 0;
    const payoffBalance = payoffMonthsRemaining * payoffInstallment;

    let atualNet = netPatrimony;
    let simNet = netPatrimony;

    for (let i = 1; i <= PROJECTION_MONTHS; i++) {
      atualNet += baselineMonthlyNet;

      // Simulated
      let monthDelta = simulatedMonthlyNet;

      // New loan effect: pay interest portion this month if still owed
      if (newLoanRemaining > 0 && i <= newLoanTerm) {
        const interest = newLoanRemaining * newLoanMonthlyInterest;
        const principal = Math.min(newLoanRemaining, newLoanInstallment - interest);
        monthDelta -= interest; // interest reduces net equity
        newLoanRemaining = Math.max(0, newLoanRemaining - principal);
      }

      // Early payoff frees up the installment cash flow (would have been spent on payoff loan principal+interest);
      // assume the payoff happens at month 1, so from month 1 onward we don't subtract that installment.
      // Since installments are net-zero on equity (cash↓ = debt↓), removing them doesn't change net delta directly.
      // But we already removed them by NOT modeling installments in baselineMonthlyNet. So payoff effect is mostly informational.

      simNet += monthDelta;

      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = `${MONTH_LABELS_SHORT[monthDate.getMonth()]}/${String(monthDate.getFullYear()).slice(2)}`;
      data.push({ label, atual: Math.round(atualNet), simulado: Math.round(simNet) });
    }

    return data;
  }, [
    baseline,
    payroll,
    revenue,
    reduction,
    otherExpenses,
    newLoanValue,
    newLoanRate,
    newLoanTerm,
    newLoanInstallment,
    payoffLoanId,
    loans,
    netPatrimony,
  ]);

  // Decision indicators
  const patrimonyIn12 = chartData[chartData.length - 1]?.simulado ?? netPatrimony;
  const patrimonyDelta = patrimonyIn12 - netPatrimony;

  // Date when all loans are paid
  const maxLoanMonths = Math.max(0, ...loanSchedule.map(l => l.monthsRemaining));
  const loanFreeDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + maxLoanMonths);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [maxLoanMonths]);

  const monthlyMargin =
    revenue - (payroll + otherExpenses - reduction) - loanPaymentsByMonth[0];

  const recommendation = useMemo(() => {
    const selectedPayoff = loans.find(l => l.id === payoffLoanId);
    if (selectedPayoff) {
      const remaining = (selectedPayoff.totalInstallments - selectedPayoff.paidInstallments) * selectedPayoff.installmentValue;
      if (cashAvailable >= remaining * 1.5) {
        return `Quitar ${selectedPayoff.contract}: caixa suficiente e libera R$ ${formatCurrencyShort(selectedPayoff.installmentValue)}/mês.`;
      }
      return `Atenção: quitar ${selectedPayoff.contract} consome ${((remaining / cashAvailable) * 100).toFixed(0)}% do caixa.`;
    }
    if (monthlyMargin > 50000) return "Margem confortável — considere quitar empréstimo de maior taxa.";
    if (monthlyMargin > 0) return "Margem positiva — manter estratégia conservadora.";
    return "Margem negativa — reduzir despesas ou renegociar empréstimos.";
  }, [payoffLoanId, loans, cashAvailable, monthlyMargin]);

  const indicators = [
    {
      label: "Patrimônio em 12 meses",
      value: formatCurrency(patrimonyIn12),
      sub: `${patrimonyDelta >= 0 ? "+" : ""}${formatCurrency(patrimonyDelta)}`,
      icon: TrendingUp,
      color: patrimonyDelta >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "Empréstimos zerados em",
      value: maxLoanMonths > 0 ? loanFreeDate : "Já zerado",
      sub: maxLoanMonths > 0 ? `${maxLoanMonths} meses` : "—",
      icon: Calendar,
      color: "text-primary",
    },
    {
      label: "Margem mensal",
      value: formatCurrency(monthlyMargin),
      sub: monthlyMargin >= 0 ? "disponível" : "déficit",
      icon: Wallet,
      color: monthlyMargin >= 0 ? "text-chart-entrada" : "text-destructive",
    },
    {
      label: "Recomendação",
      value: recommendation,
      sub: "",
      icon: Lightbulb,
      color: "text-warning-foreground",
      isText: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {indicators.map(ind => (
          <Card key={ind.label} className="animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ind.icon className={`h-4 w-4 ${ind.color}`} />
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {ind.label}
                </span>
              </div>
              <p className={`${ind.isText ? "text-sm" : "text-lg md:text-xl font-bold tabular-nums"} ${ind.color}`}>
                {ind.value}
              </p>
              {ind.sub && <p className="text-xs text-muted-foreground mt-1">{ind.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Projeção de Patrimônio Líquido — Atual vs Simulado</CardTitle>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3 w-3 mr-1" /> Resetar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v: number) => formatCurrencyShort(v)}
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="atual"
                  name="Cenário atual"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="simulado"
                  name="Cenário simulado"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                {maxLoanMonths > 0 && maxLoanMonths <= PROJECTION_MONTHS && (
                  <ReferenceLine
                    x={chartData[maxLoanMonths - 1]?.label}
                    stroke="hsl(var(--success))"
                    strokeDasharray="4 4"
                    label={{ value: "Quitação total", position: "top", fontSize: 10, fill: "hsl(var(--success))" }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operacional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Folha de pagamento</Label>
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(payroll)}</span>
              </div>
              <Slider
                value={[payroll]}
                min={150000}
                max={250000}
                step={1000}
                onValueChange={v => setPayroll(v[0])}
              />
              <p className="text-xs text-muted-foreground mt-1">Detectado: {formatCurrency(detectedPayroll)}</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Faturamento mensal</Label>
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(revenue)}</span>
              </div>
              <Slider
                value={[revenue]}
                min={Math.max(0, baseRevenue * 0.5)}
                max={Math.max(baseRevenue * 1.5, 100000)}
                step={5000}
                onValueChange={v => setRevenue(v[0])}
              />
              <p className="text-xs text-muted-foreground mt-1">Média 6m: {formatCurrency(baseRevenue)}</p>
            </div>

            <div>
              <Label htmlFor="reduction">Redução planejada (R$/mês)</Label>
              <Input
                id="reduction"
                type="number"
                value={reduction}
                onChange={e => setReduction(Number(e.target.value) || 0)}
                placeholder="Ex: 25000"
              />
            </div>

            <div>
              <Label htmlFor="otherExp">Outras despesas mensais</Label>
              <Input
                id="otherExp"
                type="number"
                value={otherExpenses}
                onChange={e => setOtherExpenses(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">Média 6m: {formatCurrency(baseOtherExpenses)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cenários de Empréstimos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="font-semibold">Simular novo empréstimo</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <Input
                    type="number"
                    value={newLoanValue}
                    onChange={e => setNewLoanValue(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Taxa %/mês</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newLoanRate}
                    onChange={e => setNewLoanRate(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Prazo (m)</Label>
                  <Input
                    type="number"
                    value={newLoanTerm}
                    onChange={e => setNewLoanTerm(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              {newLoanValue > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Parcela ≈ <span className="font-semibold">{formatCurrency(newLoanInstallment)}</span> / mês
                </p>
              )}
            </div>

            <div>
              <Label className="font-semibold">Quitação antecipada</Label>
              <Select value={payoffLoanId} onValueChange={setPayoffLoanId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione um empréstimo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {loans.map(l => {
                    const remaining = (l.totalInstallments - l.paidInstallments) * l.installmentValue;
                    return (
                      <SelectItem key={l.id} value={l.id}>
                        {l.contract} — {formatCurrency(remaining)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <p>
                <span className="text-muted-foreground">Caixa disponível:</span>{" "}
                <span className="font-semibold tabular-nums">{formatCurrency(cashAvailable)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Dívida total:</span>{" "}
                <span className="font-semibold tabular-nums">{formatCurrency(totalDebt)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Parcelas mensais (atual):</span>{" "}
                <span className="font-semibold tabular-nums">{formatCurrency(loanPaymentsByMonth[0])}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans timeline */}
      {loanSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cronograma de Quitação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loanSchedule
                .sort((a, b) => a.monthsRemaining - b.monthsRemaining)
                .map(l => {
                  const pct = Math.min(100, (l.monthsRemaining / Math.max(1, maxLoanMonths)) * 100);
                  const endDate = new Date();
                  endDate.setMonth(endDate.getMonth() + l.monthsRemaining);
                  return (
                    <div key={l.id} className="flex items-center gap-3 text-sm">
                      <div className="w-32 truncate font-medium">{l.contract}</div>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-24 text-right text-muted-foreground tabular-nums">
                        {l.monthsRemaining}m
                      </div>
                      <div className="w-28 text-right text-xs text-muted-foreground">
                        {endDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
