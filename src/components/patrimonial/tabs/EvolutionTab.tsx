import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, FileDown, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Snapshot {
  id: string;
  month: string;
  gross_patrimony: number;
  total_debt: number;
  net_equity_per_partner: number;
  notes?: string;
}

interface EvolutionTabProps {
  readOnly: boolean;
  numSocios: number;
  autoGrossPatrimony?: number;
  autoTotalDebt?: number;
}

const MONTHS_ORDER = [
  "01", "02", "03", "04", "05", "06",
  "07", "08", "09", "10", "11", "12",
];

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

function sortSnapshots(a: Snapshot, b: Snapshot) {
  const [mA, yA] = a.month.split("/");
  const [mB, yB] = b.month.split("/");
  if (yA !== yB) return Number(yA) - Number(yB);
  return Number(mA) - Number(mB);
}

function formatMonth(month: string) {
  const [m, y] = month.split("/");
  return `${MONTH_LABELS[m] || m}/${y}`;
}

const emptyForm = { month: "", gross_patrimony: "", total_debt: "", notes: "" };

export function EvolutionTab({ readOnly, numSocios, autoGrossPatrimony, autoTotalDebt }: EvolutionTabProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  });

  const handleDownloadReport = async () => {
    setGeneratingReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/generate-report?month=${encodeURIComponent(reportMonth)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao gerar relatório");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${reportMonth.replace("/", "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Relatório gerado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar relatório");
    } finally {
      setGeneratingReport(false);
    }
  };

  const fetchSnapshots = useCallback(async () => {
    const { data, error } = await supabase
      .from("patrimony_snapshots")
      .select("*");
    if (error) {
      console.error(error);
      return;
    }
    const mapped: Snapshot[] = (data || []).map((r: any) => ({
      id: r.id,
      month: r.month,
      gross_patrimony: Number(r.gross_patrimony),
      total_debt: Number(r.total_debt),
      net_equity_per_partner: Number(r.net_equity_per_partner),
      notes: r.notes || "",
    }));
    setSnapshots(mapped.sort(sortSnapshots));
    setLoading(false);
  }, []);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  useEffect(() => {
    if (autoGrossPatrimony === undefined || loading) return;
    const now = new Date();
    const currentMonth = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    const debt = autoTotalDebt ?? 0;
    const netPerPartner = numSocios > 0 ? (autoGrossPatrimony - debt) / numSocios : 0;

    const existing = snapshots.find(s => s.month === currentMonth);
    const needsUpdate = !existing ||
      Math.abs(existing.gross_patrimony - autoGrossPatrimony) > 0.01 ||
      Math.abs(existing.total_debt - debt) > 0.01;

    if (!needsUpdate) return;

    const payload = {
      month: currentMonth,
      gross_patrimony: autoGrossPatrimony,
      total_debt: debt,
      net_equity_per_partner: netPerPartner,
      notes: "Atualizado automaticamente",
    };

    (async () => {
      if (existing) {
        await supabase.from("patrimony_snapshots").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("patrimony_snapshots").insert(payload);
      }
      fetchSnapshots();
    })();
  }, [autoGrossPatrimony, autoTotalDebt, numSocios, loading, snapshots, fetchSnapshots]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s: Snapshot) => {
    setEditId(s.id);
    setForm({
      month: s.month,
      gross_patrimony: String(s.gross_patrimony),
      total_debt: String(s.total_debt),
      notes: s.notes || "",
    });
    setModalOpen(true);
  };

  const grossNum = Number(form.gross_patrimony) || 0;
  const debtNum = Number(form.total_debt) || 0;
  const autoNetPerPartner = numSocios > 0 ? (grossNum - debtNum) / numSocios : 0;

  const handleSave = async () => {
    if (!form.month || !form.gross_patrimony) {
      toast.error("Preencha o mês e o patrimônio bruto");
      return;
    }

    const monthRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    if (!monthRegex.test(form.month)) {
      toast.error("Formato do mês inválido. Use MM/AAAA");
      return;
    }

    const payload = {
      month: form.month,
      gross_patrimony: grossNum,
      total_debt: debtNum,
      net_equity_per_partner: autoNetPerPartner,
      notes: form.notes || null,
    };

    if (editId) {
      const { error } = await supabase
        .from("patrimony_snapshots")
        .update(payload)
        .eq("id", editId);
      if (error) {
        toast.error("Erro ao atualizar snapshot");
        console.error(error);
        return;
      }
      toast.success("Snapshot atualizado");
    } else {
      const { error } = await supabase
        .from("patrimony_snapshots")
        .insert(payload);
      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe um snapshot para esse mês");
        } else {
          toast.error("Erro ao salvar snapshot");
        }
        console.error(error);
        return;
      }
      toast.success("Snapshot adicionado");
    }

    setModalOpen(false);
    fetchSnapshots();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("patrimony_snapshots")
      .delete()
      .eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir snapshot");
      console.error(error);
    } else {
      toast.success("Snapshot excluído");
      fetchSnapshots();
    }
    setDeleteId(null);
  };

  const chartData = snapshots.map((s) => ({
    month: formatMonth(s.month),
    "Patrimônio Bruto": s.gross_patrimony,
    "Dívida Total": s.total_debt,
    "Líquido/Sócio": s.net_equity_per_partner,
  }));

  // Calculate trends
  const lastTwo = snapshots.slice(-2);
  const hasTrend = lastTwo.length === 2;
  const grossTrend = hasTrend ? lastTwo[1].gross_patrimony - lastTwo[0].gross_patrimony : 0;
  const debtTrend = hasTrend ? lastTwo[1].total_debt - lastTwo[0].total_debt : 0;
  const partnerTrend = hasTrend ? lastTwo[1].net_equity_per_partner - lastTwo[0].net_equity_per_partner : 0;

  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Report Download */}
      <div className="flex justify-end">
        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
            <FileDown className="h-4 w-4 mr-1" />
            Exportar Relatório
          </Button>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Exportar Relatório Mensal</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Mês</Label>
                <select
                  value={reportMonth.split("/")[0]}
                  onChange={(e) => setReportMonth(`${e.target.value}/${reportMonth.split("/")[1]}`)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {MONTHS_ORDER.map((m) => (
                    <option key={m} value={m}>{MONTH_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <select
                  value={reportMonth.split("/")[1]}
                  onChange={(e) => setReportMonth(`${reportMonth.split("/")[0]}/${e.target.value}`)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {Array.from({ length: 6 }).map((_, i) => {
                    const y = String(new Date().getFullYear() - i);
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportOpen(false)}>Cancelar</Button>
              <Button onClick={handleDownloadReport} disabled={generatingReport}>
                {generatingReport ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                {generatingReport ? "Gerando..." : "Baixar PDF"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {/* KPI Summary */}
      {latest && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Patrimônio Bruto</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(latest.gross_patrimony)}</p>
              {hasTrend && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${grossTrend >= 0 ? "text-chart-entrada" : "text-destructive"}`}>
                  {grossTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {grossTrend >= 0 ? "+" : ""}{formatCurrency(grossTrend)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Dívida Total</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(latest.total_debt)}</p>
              {hasTrend && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${debtTrend <= 0 ? "text-chart-entrada" : "text-destructive"}`}>
                  {debtTrend <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {debtTrend >= 0 ? "+" : ""}{formatCurrency(debtTrend)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Líquido/Sócio ({numSocios})</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(latest.net_equity_per_partner)}</p>
              {hasTrend && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${partnerTrend >= 0 ? "text-chart-entrada" : "text-destructive"}`}>
                  {partnerTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {partnerTrend >= 0 ? "+" : ""}{formatCurrency(partnerTrend)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {chartData.length >= 2 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Patrimônio Bruto vs Dívida Total</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Patrimônio Bruto" stroke="hsl(var(--chart-entrada))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Dívida Total" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Crescimento Líquido por Sócio</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="Líquido/Sócio" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Adicione pelo menos 2 snapshots mensais para visualizar os gráficos de evolução.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Dados Mensais</CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Novo Mês
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {snapshots.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Nenhum dado registrado. Clique em "Novo Mês" para adicionar.
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Mês</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Patrimônio Bruto</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Dívida Total</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Líquido/Sócio</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Obs.</th>
                      {!readOnly && <th className="p-3 w-20"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((s, i) => (
                      <tr key={s.id} className={`border-b hover:bg-muted/20 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                        <td className="p-3 font-medium text-foreground">{formatMonth(s.month)}</td>
                        <td className="p-3 text-right tabular-nums text-foreground">{formatCurrency(s.gross_patrimony)}</td>
                        <td className="p-3 text-right tabular-nums text-foreground">{formatCurrency(s.total_debt)}</td>
                        <td className="p-3 text-right tabular-nums text-foreground">{formatCurrency(s.net_equity_per_partner)}</td>
                        <td className="p-3 text-muted-foreground text-xs max-w-[150px] truncate">{s.notes || "—"}</td>
                        {!readOnly && (
                          <td className="p-3 flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(s.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y">
                {snapshots.map((s) => (
                  <div key={s.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-sm text-foreground">{formatMonth(s.month)}</p>
                      {!readOnly && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Bruto</p>
                        <p className="font-medium tabular-nums text-foreground">{formatCurrency(s.gross_patrimony)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Dívida</p>
                        <p className="font-medium tabular-nums text-foreground">{formatCurrency(s.total_debt)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Líq./Sócio</p>
                        <p className="font-medium tabular-nums text-foreground">{formatCurrency(s.net_equity_per_partner)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Snapshot" : "Novo Snapshot Mensal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mês (MM/AAAA) *</Label>
              <Input
                placeholder="04/2026"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
                disabled={!!editId}
                maxLength={7}
              />
            </div>
            <div>
              <Label>Patrimônio Bruto (R$) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.gross_patrimony}
                onChange={(e) => setForm({ ...form, gross_patrimony: e.target.value })}
              />
            </div>
            <div>
              <Label>Dívida Total (R$)</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.total_debt}
                onChange={(e) => setForm({ ...form, total_debt: e.target.value })}
              />
            </div>
            <div>
              <Label>Líquido/Sócio (calculado: {numSocios} sócios)</Label>
              <Input
                type="text"
                value={formatCurrency(autoNetPerPartner)}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                placeholder="Notas opcionais"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editId ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este snapshot? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
