import { useMemo, useRef, useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, MONTH_LABELS_SHORT, MONTH_LABELS } from "@/utils/formatters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, ReferenceLine,
} from "recharts";
import { Download, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { PatrimonialReportSection } from "@/components/reports/PatrimonialReportSection";

type PeriodType = "month" | "quarter" | "semester" | "year" | "custom";

const PIE_COLORS = [
  "#A32D2D", "#0F6E56", "#1F3864", "#D46A6A", "#25A686",
  "#3B6FA0", "#E08888", "#4DD4B0", "#5B8DCE", "#CC6633",
  "#9B72CF", "#E8A87C", "#73B6E8", "#C44569", "#87A878",
];

export default function ReportsPage() {
  const { transactions, loading } = useTransactions();
  const { categories: customCats } = useCustomCategories();
  const containerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const today = new Date();
  const [period, setPeriod] = useState<PeriodType>("year");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(today.getMonth() / 3) + 1);
  const [semester, setSemester] = useState(today.getMonth() < 6 ? 1 : 2);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "Entrada" | "Saída">("all");

  // Compute date range
  const dateRange = useMemo(() => {
    if (period === "custom" && startDate && endDate) {
      return { start: startDate, end: endDate };
    }
    if (period === "month") {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    if (period === "quarter") {
      const start = new Date(year, (quarter - 1) * 3, 1);
      const end = new Date(year, quarter * 3, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    if (period === "semester") {
      const start = new Date(year, (semester - 1) * 6, 1);
      const end = new Date(year, semester * 6, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }, [period, year, month, quarter, semester, startDate, endDate]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (t.date < dateRange.start || t.date > dateRange.end) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      return true;
    });
  }, [transactions, dateRange, typeFilter, categoryFilter]);

  // Aggregates
  const totals = useMemo(() => {
    let entradas = 0, saidas = 0;
    filtered.forEach(t => {
      if (t.type === "Entrada") entradas += t.value;
      else saidas += t.value;
    });
    return { entradas, saidas, lucro: entradas - saidas };
  }, [filtered]);

  // Monthly breakdown across selected range
  const monthlyData = useMemo(() => {
    const map: Record<string, { entradas: number; saidas: number }> = {};
    filtered.forEach(t => {
      const key = t.date.slice(0, 7); // YYYY-MM
      if (!map[key]) map[key] = { entradas: 0, saidas: 0 };
      if (t.type === "Entrada") map[key].entradas += t.value;
      else map[key].saidas += t.value;
    });
    const keys = Object.keys(map).sort();
    let acc = 0;
    return keys.map(k => {
      const [yy, mm] = k.split("-");
      const label = `${MONTH_LABELS_SHORT[parseInt(mm, 10) - 1]}/${yy.slice(2)}`;
      const balance = map[k].entradas - map[k].saidas;
      acc += balance;
      return {
        key: k,
        label,
        Entradas: map[k].entradas,
        Saídas: map[k].saidas,
        Lucro: balance,
        Saldo: acc,
      };
    });
  }, [filtered]);

  const saidasPorCategoria = useMemo(() => groupCategory(filtered.filter(t => t.type === "Saída")), [filtered]);
  const entradasPorCategoria = useMemo(() => groupCategory(filtered.filter(t => t.type === "Entrada")), [filtered]);

  // Compare current vs previous month
  const comparison = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const curr = monthlyData[monthlyData.length - 1];
    const prev = monthlyData[monthlyData.length - 2];
    const pct = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / Math.abs(b)) * 100;
    return {
      curr: curr.label,
      prev: prev.label,
      entradasVar: pct(curr.Entradas, prev.Entradas),
      saidasVar: pct(curr.Saídas, prev.Saídas),
      lucroVar: pct(curr.Lucro, prev.Lucro),
      currLucro: curr.Lucro,
      prevLucro: prev.Lucro,
    };
  }, [monthlyData]);

  // Projection: average of last 3 months extended forward
  const projection = useMemo(() => {
    if (monthlyData.length === 0) return [];
    const last = monthlyData.slice(-3);
    const avgIn = last.reduce((s, m) => s + m.Entradas, 0) / last.length;
    const avgOut = last.reduce((s, m) => s + m.Saídas, 0) / last.length;
    const lastKey = monthlyData[monthlyData.length - 1].key;
    const [yStr, mStr] = lastKey.split("-");
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10);
    const proj = [];
    let saldo = monthlyData[monthlyData.length - 1].Saldo;
    for (let i = 0; i < 3; i++) {
      m += 1;
      if (m > 12) { m = 1; y += 1; }
      saldo += (avgIn - avgOut);
      proj.push({
        label: `${MONTH_LABELS_SHORT[m - 1]}/${String(y).slice(2)}`,
        Entradas: Math.round(avgIn),
        Saídas: Math.round(avgOut),
        Lucro: Math.round(avgIn - avgOut),
        Saldo: Math.round(saldo),
      });
    }
    return proj;
  }, [monthlyData]);

  const allCategories = useMemo(() => {
    const s = new Set<string>();
    transactions.forEach(t => s.add(t.category));
    customCats.forEach(c => s.add(c.name));
    return Array.from(s).sort();
  }, [transactions, customCats]);

  const exportPDF = async () => {
    if (!containerRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let position = 0;
      let heightLeft = imgH;
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }

      pdf.save(`relatorio-primegrid-${dateRange.start}-a-${dateRange.end}.pdf`);
      toast.success("Relatório exportado");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Relatórios" />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Relatórios" />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div>
                <Label className="text-xs">Período</Label>
                <Select value={period} onValueChange={(v: PeriodType) => setPeriod(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Mês</SelectItem>
                    <SelectItem value="quarter">Trimestre</SelectItem>
                    <SelectItem value="semester">Semestre</SelectItem>
                    <SelectItem value="year">Ano</SelectItem>
                    <SelectItem value="custom">Customizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {period !== "custom" && (
                <div>
                  <Label className="text-xs">Ano</Label>
                  <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {period === "month" && (
                <div>
                  <Label className="text-xs">Mês</Label>
                  <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v, 10))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_LABELS.map((l, i) => <SelectItem key={i} value={String(i + 1)}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {period === "quarter" && (
                <div>
                  <Label className="text-xs">Trimestre</Label>
                  <Select value={String(quarter)} onValueChange={(v) => setQuarter(parseInt(v, 10))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map(q => <SelectItem key={q} value={String(q)}>{q}º Tri</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {period === "semester" && (
                <div>
                  <Label className="text-xs">Semestre</Label>
                  <Select value={String(semester)} onValueChange={(v) => setSemester(parseInt(v, 10))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1º Sem</SelectItem>
                      <SelectItem value="2">2º Sem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {period === "custom" && (
                <>
                  <div>
                    <Label className="text-xs">Início</Label>
                    <Input type="date" className="mt-1" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Fim</Label>
                    <Input type="date" className="mt-1" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={typeFilter} onValueChange={(v: "all" | "Entrada" | "Saída") => setTypeFilter(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Entrada">Entradas</SelectItem>
                    <SelectItem value="Saída">Saídas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={exportPDF} disabled={exporting} className="w-full">
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  Exportar PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report content (capturable) */}
        <div ref={containerRef} className="space-y-4 bg-background p-2">
          <div className="text-center pb-2">
            <h2 className="text-2xl font-bold text-foreground">Relatório Financeiro PrimeGrid</h2>
            <p className="text-sm text-muted-foreground">Período: {dateRange.start} a {dateRange.end}</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard title="Receitas" value={totals.entradas} color="text-chart-entrada" />
            <KpiCard title="Despesas" value={totals.saidas} color="text-chart-saida" />
            <KpiCard title="Lucro / Prejuízo" value={totals.lucro} color={totals.lucro >= 0 ? "text-chart-entrada" : "text-chart-saida"} />
          </div>

          {/* Comparison */}
          {comparison && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Comparativo: {comparison.curr} vs {comparison.prev}</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <CompareRow label="Receitas" pct={comparison.entradasVar} positiveIsGood />
                <CompareRow label="Despesas" pct={comparison.saidasVar} positiveIsGood={false} />
                <CompareRow label="Lucro" pct={comparison.lucroVar} positiveIsGood />
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="charts" className="space-y-4">
            <TabsList>
              <TabsTrigger value="charts">Gráficos</TabsTrigger>
              <TabsTrigger value="tables">Tabelas</TabsTrigger>
              <TabsTrigger value="projection">Projeção</TabsTrigger>
            </TabsList>

            <TabsContent value="charts" className="space-y-4">
              {/* Bar chart Receitas vs Despesas */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Receitas x Despesas por Mês</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="Entradas" fill="#0F6E56" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Saídas" fill="#A32D2D" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Despesas por Categoria</CardTitle></CardHeader>
                  <CardContent>
                    <PieBlock data={saidasPorCategoria} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Receitas por Categoria</CardTitle></CardHeader>
                  <CardContent>
                    <PieBlock data={entradasPorCategoria} />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Evolução do Saldo</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1F3864" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#1F3864" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <ReferenceLine y={0} stroke="#A32D2D" strokeDasharray="3 3" />
                      <Area type="monotone" dataKey="Saldo" stroke="#1F3864" strokeWidth={2} fill="url(#rg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tables" className="space-y-4">
              <CategoryTable title="Despesas por Categoria" data={saidasPorCategoria} />
              <CategoryTable title="Receitas por Categoria" data={entradasPorCategoria} />
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Resumo Mensal</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês</TableHead>
                        <TableHead className="text-right">Receitas</TableHead>
                        <TableHead className="text-right">Despesas</TableHead>
                        <TableHead className="text-right">Lucro</TableHead>
                        <TableHead className="text-right">Saldo Acum.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.map(m => (
                        <TableRow key={m.key}>
                          <TableCell className="font-medium">{m.label}</TableCell>
                          <TableCell className="text-right tabular-nums text-chart-entrada">{formatCurrency(m.Entradas)}</TableCell>
                          <TableCell className="text-right tabular-nums text-chart-saida">{formatCurrency(m.Saídas)}</TableCell>
                          <TableCell className={`text-right tabular-nums ${m.Lucro >= 0 ? "text-chart-entrada" : "text-chart-saida"}`}>{formatCurrency(m.Lucro)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(m.Saldo)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projection" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Projeção Próximos 3 Meses</CardTitle>
                  <p className="text-xs text-muted-foreground">Baseada na média dos últimos 3 meses</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={[...monthlyData, ...projection.map(p => ({ ...p, projection: true }))]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="Entradas" stroke="#0F6E56" strokeWidth={2} />
                      <Line type="monotone" dataKey="Saídas" stroke="#A32D2D" strokeWidth={2} />
                      <Line type="monotone" dataKey="Saldo" stroke="#1F3864" strokeWidth={2} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês (proj.)</TableHead>
                        <TableHead className="text-right">Receitas est.</TableHead>
                        <TableHead className="text-right">Despesas est.</TableHead>
                        <TableHead className="text-right">Lucro est.</TableHead>
                        <TableHead className="text-right">Saldo est.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projection.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{p.label}</TableCell>
                          <TableCell className="text-right tabular-nums text-chart-entrada">{formatCurrency(p.Entradas)}</TableCell>
                          <TableCell className="text-right tabular-nums text-chart-saida">{formatCurrency(p.Saídas)}</TableCell>
                          <TableCell className={`text-right tabular-nums ${p.Lucro >= 0 ? "text-chart-entrada" : "text-chart-saida"}`}>{formatCurrency(p.Lucro)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(p.Saldo)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function groupCategory(txs: { category: string; value: number }[]) {
  const map: Record<string, number> = {};
  txs.forEach(t => { map[t.category] = (map[t.category] || 0) + t.value; });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function KpiCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className={`text-2xl font-bold tabular-nums ${color}`}>{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  );
}

function CompareRow({ label, pct, positiveIsGood }: { label: string; pct: number; positiveIsGood: boolean }) {
  const isUp = pct >= 0;
  const isGood = positiveIsGood ? isUp : !isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const color = isGood ? "text-chart-entrada" : "text-chart-saida";
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1 font-semibold tabular-nums ${color}`}>
        <Icon className="h-4 w-4" />
        {isUp ? "+" : ""}{pct.toFixed(1)}%
      </span>
    </div>
  );
}

function PieBlock({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <div className="text-center text-sm text-muted-foreground py-8">Sem dados</div>;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1 mt-2 max-h-40 overflow-y-auto">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="truncate flex-1">{d.name}</span>
            <span className="tabular-nums text-muted-foreground">{formatCurrency(d.value)}</span>
            <span className="tabular-nums text-muted-foreground w-10 text-right">{((d.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </>
  );
}

function CategoryTable({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right w-20">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
            ) : data.map(d => (
              <TableRow key={d.name}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(d.value)}</TableCell>
                <TableCell className="text-right tabular-nums">{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
            ))}
            {data.length > 0 && (
              <TableRow className="font-bold bg-muted/30">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(total)}</TableCell>
                <TableCell className="text-right tabular-nums">100%</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
