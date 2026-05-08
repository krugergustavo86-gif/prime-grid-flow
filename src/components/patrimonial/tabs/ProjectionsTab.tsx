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
import { TrendingUp, Calendar, Wallet, Lightbulb, RotateCcw, Rocket, PieChart } from "lucide-react";

interface Props {
  transactions: Transaction[];
  loans: Loan[];
  netPatrimony: number;
  totalDebt: number;
  cashAvailable: number;
}

const HORIZON_OPTIONS = [
  { value: "12", label: "12 meses" },
  { value: "24", label: "24 meses" },
  { value: "36", label: "36 meses" },
  { value: "60", label: "5 anos" },
  { value: "120", label: "10 anos" },
];

type CostKey = "folha" | "materiais" | "operacional" | "impostos" | "comissoes" | "outros";

const COST_GROUPS: { key: CostKey; label: string; match: (cat: string) => boolean }[] = [
  { key: "folha", label: "Folha de pagamento", match: c => c.includes("salário") || c.includes("salario") || c.includes("folha") || c.includes("reserva") || c.includes("décimo") || c.includes("decimo") || c.includes("férias") || c.includes("ferias") },
  { key: "materiais", label: "Materiais", match: c => c.includes("materia") || c.includes("solar kit") },
  { key: "operacional", label: "Custos operacionais", match: c => c.includes("custos fixos") || c.includes("custo operacional") || c.includes("combustível") || c.includes("combustivel") || c.includes("manutenç") },
  { key: "impostos", label: "Impostos/Contabilidade", match: c => c.includes("imposto") || c.includes("contabil") },
  { key: "comissoes", label: "Comissões/Marketing", match: c => c.includes("comiss") || c.includes("marketing") },
  { key: "outros", label: "Outros custos", match: () => false },
];

function isLoanCategory(cat: string) {
  return cat.includes("emprésti") || cat.includes("emprest") || cat.includes("financiamento");
}

function classifyCost(category: string): CostKey {
  const c = category.toLowerCase();
  for (const g of COST_GROUPS) {
    if (g.key === "outros") continue;
    if (g.match(c)) return g.key;
  }
  return "outros";
}

interface Baseline {
  monthsUsed: number;
  avgRevenue: number;
  avgCosts: Record<CostKey, number>;
  avgTotalCosts: number;
  avgNetProfit: number;
  avgLoanPayments: number;
}

function computeBaseline(transactions: Transaction[]): Baseline {
  const now = new Date();
  const buckets = new Map<string, { entradas: number; loans: number; costs: Record<CostKey, number> }>();
  // Last 6 closed months (excludes current month)
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    buckets.set(key, {
      entradas: 0,
      loans: 0,
      costs: { folha: 0, materiais: 0, operacional: 0, impostos: 0, comissoes: 0, outros: 0 },
    });
  }
  for (const t of transactions) {
    const b = buckets.get(t.month);
    if (!b) continue;
    if (t.type === "Entrada") {
      b.entradas += t.value;
    } else {
      const cat = t.category.toLowerCase();
      if (isLoanCategory(cat)) {
        b.loans += t.value;
      } else {
        b.costs[classifyCost(t.category)] += t.value;
      }
    }
  }
  // Use only months with real activity
  const active = Array.from(buckets.values()).filter(b => b.entradas > 0 || b.loans > 0 || Object.values(b.costs).some(v => v > 0));
  const n = active.length || 1;
  const avgCosts: Record<CostKey, number> = { folha: 0, materiais: 0, operacional: 0, impostos: 0, comissoes: 0, outros: 0 };
  for (const k of Object.keys(avgCosts) as CostKey[]) {
    avgCosts[k] = active.reduce((s, b) => s + b.costs[k], 0) / n;
  }
  const avgRevenue = active.reduce((s, b) => s + b.entradas, 0) / n;
  const avgLoanPayments = active.reduce((s, b) => s + b.loans, 0) / n;
  const avgTotalCosts = Object.values(avgCosts).reduce((s, v) => s + v, 0);
  return {
    monthsUsed: active.length,
    avgRevenue: Math.round(avgRevenue),
    avgCosts: Object.fromEntries(
      Object.entries(avgCosts).map(([k, v]) => [k, Math.round(v)]),
    ) as Record<CostKey, number>,
    avgTotalCosts: Math.round(avgTotalCosts),
    avgNetProfit: Math.round(avgRevenue - avgTotalCosts),
    avgLoanPayments: Math.round(avgLoanPayments),
  };
}

export function ProjectionsTab({ transactions, loans, netPatrimony, totalDebt, cashAvailable }: Props) {
  const baseline = useMemo(() => computeBaseline(transactions), [transactions]);

  const [horizon, setHorizon] = useState("12");
  const projectionMonths = parseInt(horizon, 10);

  const [revenue, setRevenue] = useState(baseline.avgRevenue);
  const [costs, setCosts] = useState<Record<CostKey, number>>(baseline.avgCosts);
  const [reduction, setReduction] = useState(0);

  const [newLoanValue, setNewLoanValue] = useState(0);
  const [newLoanRate, setNewLoanRate] = useState(2);
  const [newLoanTerm, setNewLoanTerm] = useState(24);

  const [payoffLoanId, setPayoffLoanId] = useState<string>("none");

  const setCost = (k: CostKey, v: number) => setCosts(prev => ({ ...prev, [k]: v }));

  const reset = () => {
    setRevenue(baseline.avgRevenue);
    setCosts(baseline.avgCosts);
    setReduction(0);
    setNewLoanValue(0);
    setNewLoanRate(2);
    setNewLoanTerm(24);
    setPayoffLoanId("none");
    setHorizon("12");
  };

  const totalSimCosts = useMemo(
    () => Object.values(costs).reduce((s, v) => s + v, 0),
    [costs],
  );
  const simulatedNetProfit = revenue - totalSimCosts + reduction;

  const loanSchedule = useMemo(() => {
    return loans.map(l => {
      const monthsRemaining = Math.max(0, l.totalInstallments - l.paidInstallments);
      return { id: l.id, contract: l.contract, monthsRemaining, monthlyPayment: l.installmentValue };
    });
  }, [loans]);

  const newLoanInstallment = useMemo(() => {
    if (newLoanValue <= 0 || newLoanTerm <= 0) return 0;
    const i = newLoanRate / 100;
    if (i === 0) return newLoanValue / newLoanTerm;
    return (newLoanValue * i * Math.pow(1 + i, newLoanTerm)) / (Math.pow(1 + i, newLoanTerm) - 1);
  }, [newLoanValue, newLoanRate, newLoanTerm]);

  const totalLoanPaymentsAt = (i: number) =>
    loanSchedule.reduce((s, l) => s + (i <= l.monthsRemaining ? l.monthlyPayment : 0), 0);

  const currentMonthlyLoanPayments = totalLoanPaymentsAt(1);

  const chartData = useMemo(() => {
    const now = new Date();
    const data: { label: string; atual: number; simulado: number; mes: number }[] = [];

    // Baseline net profit from real history (excludes loan payments — those are equity-neutral)
    const baselineNet = baseline.avgNetProfit;

    let newLoanRemaining = newLoanValue;
    const newLoanMonthlyRate = newLoanRate / 100;

    let atualNet = netPatrimony;
    let simNet = netPatrimony;

    for (let i = 1; i <= projectionMonths; i++) {
      atualNet += baselineNet;
      let monthDelta = simulatedNetProfit;

      if (newLoanRemaining > 0 && i <= newLoanTerm) {
        const interest = newLoanRemaining * newLoanMonthlyRate;
        const principal = Math.min(newLoanRemaining, newLoanInstallment - interest);
        monthDelta -= interest;
        newLoanRemaining = Math.max(0, newLoanRemaining - principal);
      }

      simNet += monthDelta;

      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      let label: string;
      if (projectionMonths <= 24) {
        label = `${MONTH_LABELS_SHORT[monthDate.getMonth()]}/${String(monthDate.getFullYear()).slice(2)}`;
      } else if (projectionMonths <= 60) {
        label = monthDate.getMonth() === 0 || i === 1
          ? `${MONTH_LABELS_SHORT[monthDate.getMonth()]}/${String(monthDate.getFullYear()).slice(2)}`
          : `${MONTH_LABELS_SHORT[monthDate.getMonth()]}`;
      } else {
        label = `${monthDate.getFullYear()}`;
      }

      data.push({ label, atual: Math.round(atualNet), simulado: Math.round(simNet), mes: i });
    }

    return data;
  }, [
    baseline, simulatedNetProfit,
    newLoanValue, newLoanRate, newLoanTerm, newLoanInstallment,
    netPatrimony, projectionMonths,
  ]);

  // X axis tick interval
  const xTickInterval = useMemo(() => {
    if (projectionMonths <= 12) return 0;
    if (projectionMonths <= 24) return 1;
    if (projectionMonths <= 36) return 2;
    if (projectionMonths <= 60) return 5;
    return 11; // every ~12 months for 10y
  }, [projectionMonths]);

  // Loan payoff markers within horizon
  const loanPayoffMarkers = useMemo(() => {
    const now = new Date();
    return loanSchedule
      .filter(l => l.monthsRemaining > 0 && l.monthsRemaining <= projectionMonths)
      .map(l => {
        const idx = l.monthsRemaining - 1;
        const d = new Date(now.getFullYear(), now.getMonth() + l.monthsRemaining, 1);
        return {
          id: l.id,
          contract: l.contract,
          monthlyPayment: l.monthlyPayment,
          monthsRemaining: l.monthsRemaining,
          label: chartData[idx]?.label ?? "",
          dateLabel: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        };
      });
  }, [loanSchedule, projectionMonths, chartData]);

  const maxLoanMonths = Math.max(0, ...loanSchedule.map(l => l.monthsRemaining));

  const loanFreeDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + maxLoanMonths);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [maxLoanMonths]);

  // Net profit (revenue - costs) is what funds equity. Loan payments come out of that net profit cash flow.
  const monthlyMargin = simulatedNetProfit - currentMonthlyLoanPayments;
  const postPayoffMargin = simulatedNetProfit;
  const freedAfterPayoff = currentMonthlyLoanPayments;

  // Patrimony at specific milestones (use simulated)
  const valueAtMonth = (m: number) => {
    if (m <= 0) return netPatrimony;
    if (m > chartData.length) return chartData[chartData.length - 1]?.simulado ?? netPatrimony;
    return chartData[m - 1]?.simulado ?? netPatrimony;
  };

  const patrimonyHorizon = chartData[chartData.length - 1]?.simulado ?? netPatrimony;
  const patrimony5y = valueAtMonth(60);
  const patrimony10y = valueAtMonth(120);

  const recommendation = useMemo(() => {
    const selectedPayoff = loans.find(l => l.id === payoffLoanId);
    if (selectedPayoff) {
      const remaining = (selectedPayoff.totalInstallments - selectedPayoff.paidInstallments) * selectedPayoff.installmentValue;
      if (cashAvailable >= remaining * 1.5) {
        return `Quitar ${selectedPayoff.contract}: caixa suficiente e libera ${formatCurrencyShort(selectedPayoff.installmentValue)}/mês.`;
      }
      return `Atenção: quitar ${selectedPayoff.contract} consome ${((remaining / Math.max(1, cashAvailable)) * 100).toFixed(0)}% do caixa.`;
    }
    if (monthlyMargin > 50000) return "Margem confortável — considere quitar empréstimo de maior taxa.";
    if (monthlyMargin > 0) return "Margem positiva — manter estratégia conservadora.";
    return "Margem negativa — reduzir despesas ou renegociar empréstimos.";
  }, [payoffLoanId, loans, cashAvailable, monthlyMargin]);

  const horizonLabel = HORIZON_OPTIONS.find(o => o.value === horizon)?.label ?? "";

  const indicators = [
    {
      label: `Patrimônio em ${horizonLabel}`,
      value: formatCurrency(patrimonyHorizon),
      sub: `${patrimonyHorizon - netPatrimony >= 0 ? "+" : ""}${formatCurrency(patrimonyHorizon - netPatrimony)}`,
      icon: TrendingUp,
      color: patrimonyHorizon - netPatrimony >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "Patrimônio em 5 anos",
      value: formatCurrency(patrimony5y),
      sub: projectionMonths < 60 ? "extrapolado" : "projetado",
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      label: "Patrimônio em 10 anos",
      value: formatCurrency(patrimony10y),
      sub: projectionMonths < 120 ? "extrapolado" : "projetado",
      icon: Rocket,
      color: "text-primary",
    },
    {
      label: "Empréstimos zerados em",
      value: maxLoanMonths > 0 ? loanFreeDate : "Já zerado",
      sub: maxLoanMonths > 0 ? `${maxLoanMonths} meses` : "—",
      icon: Calendar,
      color: "text-primary",
    },
    {
      label: "Margem mensal atual",
      value: formatCurrency(monthlyMargin),
      sub: monthlyMargin >= 0 ? "disponível" : "déficit",
      icon: Wallet,
      color: monthlyMargin >= 0 ? "text-chart-entrada" : "text-destructive",
    },
    {
      label: "Margem pós-quitação",
      value: formatCurrency(postPayoffMargin),
      sub: `+${formatCurrencyShort(freedAfterPayoff)}/mês livres`,
      icon: Rocket,
      color: "text-success",
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
      {/* Horizon selector */}
      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-sm">Horizonte de projeção:</Label>
        <Select value={horizon} onValueChange={setHorizon}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HORIZON_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="h-3 w-3 mr-1" /> Resetar
        </Button>
      </div>

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
        <CardHeader>
          <CardTitle className="text-base">
            Projeção de Patrimônio Líquido — {horizonLabel} (Atual vs Simulado)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  interval={xTickInterval}
                  minTickGap={10}
                />
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
                  dot={false}
                />
                {loanPayoffMarkers.map(m => (
                  <ReferenceLine
                    key={m.id}
                    x={m.label}
                    stroke="hsl(var(--success))"
                    strokeDasharray="3 3"
                    label={{
                      value: `✓ ${m.contract} (+${formatCurrencyShort(m.monthlyPayment)}/m)`,
                      position: "top",
                      fontSize: 9,
                      fill: "hsl(var(--success))",
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {loanPayoffMarkers.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Marcadores verdes indicam o mês de quitação de cada empréstimo. Após cada quitação, a parcela correspondente deixa de ser paga, liberando margem mensal.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" /> Receita e Custos (média real)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Base: média dos últimos {baseline.monthsUsed} {baseline.monthsUsed === 1 ? "mês com dados" : "meses com dados"}.
              Ajuste cada linha para simular cenários.
            </p>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-sm">Faturamento mensal</Label>
                <span className="text-sm font-semibold tabular-nums text-success">{formatCurrency(revenue)}</span>
              </div>
              <Slider
                value={[revenue]}
                min={Math.max(0, baseline.avgRevenue * 0.5)}
                max={Math.max(baseline.avgRevenue * 1.5, 100000)}
                step={5000}
                onValueChange={v => setRevenue(v[0])}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Média real: {formatCurrency(baseline.avgRevenue)}</p>
            </div>

            <div className="space-y-3 pt-2 border-t">
              {COST_GROUPS.map(g => (
                <div key={g.key}>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs">{g.label}</Label>
                    <span className="text-xs font-semibold tabular-nums text-destructive">
                      − {formatCurrency(costs[g.key])}
                    </span>
                  </div>
                  <Input
                    type="number"
                    value={costs[g.key]}
                    onChange={e => setCost(g.key, Number(e.target.value) || 0)}
                    className="h-8"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Média real: {formatCurrency(baseline.avgCosts[g.key])}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="reduction" className="text-xs">Economia adicional planejada (R$/mês)</Label>
              <Input
                id="reduction"
                type="number"
                value={reduction}
                onChange={e => setReduction(Number(e.target.value) || 0)}
                placeholder="Ex: 25000"
                className="h-8"
              />
            </div>

            <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receita simulada:</span>
                <span className="font-semibold tabular-nums">{formatCurrency(revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custos simulados:</span>
                <span className="font-semibold tabular-nums text-destructive">− {formatCurrency(totalSimCosts)}</span>
              </div>
              {reduction > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Economia planejada:</span>
                  <span className="font-semibold tabular-nums text-success">+ {formatCurrency(reduction)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t">
                <span className="font-semibold">Lucro líquido projetado:</span>
                <span className={`font-bold tabular-nums ${simulatedNetProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(simulatedNetProfit)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span className="text-muted-foreground">Margem líquida:</span>
                <span className="tabular-nums">
                  {revenue > 0 ? `${((simulatedNetProfit / revenue) * 100).toFixed(1)}%` : "—"}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Lucro real (média 6m):</span>
                <span className="tabular-nums">{formatCurrency(baseline.avgNetProfit)}</span>
              </div>
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
                  <Input type="number" value={newLoanValue} onChange={e => setNewLoanValue(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Taxa %/mês</Label>
                  <Input type="number" step="0.1" value={newLoanRate} onChange={e => setNewLoanRate(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Prazo (m)</Label>
                  <Input type="number" value={newLoanTerm} onChange={e => setNewLoanTerm(Number(e.target.value) || 0)} />
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
                <span className="font-semibold tabular-nums">{formatCurrency(currentMonthlyLoanPayments)}</span>
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
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-24 text-right text-muted-foreground tabular-nums">{l.monthsRemaining}m</div>
                      <div className="w-28 text-right text-xs text-muted-foreground">
                        {endDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
                      </div>
                      <div className="w-28 text-right text-xs text-success tabular-nums">
                        +{formatCurrencyShort(l.monthlyPayment)}/m
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
