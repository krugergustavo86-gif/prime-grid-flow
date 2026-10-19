import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { FileText, Pencil, Plus, Link2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useServiceInvoices } from "@/hooks/useServiceInvoices";
import { useTransactions } from "@/hooks/useTransactions";
import { margemOperacional } from "@/hooks/usePosicaoPatrimonial";
import { formatCurrency } from "@/utils/formatters";
import { serviceMonthSummary, serviceInvoiceAmounts, type ServiceInvoice } from "@/utils/serviceInvoiceTotals";
import { ServiceInvoiceForm } from "./ServiceInvoiceForm";
import { ServiceInvoiceDetails } from "./ServiceInvoiceDetails";

function CashMargin({ month }: { month: string }) {
  const { transactions, loading } = useTransactions();
  const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const result = margemOperacional(transactions, `${month}-01`, `${month}-${lastDay}`);
  return <div><p className="text-xs text-muted-foreground">Margem operacional • caixa • empresa</p><p className="font-semibold text-xl tabular-nums">{loading ? "…" : result.margem === null ? "—" : `${result.margem.toFixed(1)}%`}</p><p className="text-xs text-muted-foreground">{month.split("-").reverse().join("/")}</p></div>;
}

export function ServiceInvoicesTab() {
  const { canManageNF, canViewAll } = useAuth();
  const data = useServiceInvoices();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceInvoice | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const summary = serviceMonthSummary(data.invoices, data.receipts, month);
  const period = data.invoices.filter(i => i.competence.slice(0, 7) === month);
  const details = data.invoices.find(i => i.id === detailId) || null;
  if (data.loading && data.invoices.length === 0) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (data.error) return <div className="py-8 text-center space-y-3"><p>Não foi possível carregar as NFS-e</p><Button variant="outline" onClick={data.refresh}>Tentar novamente</Button></div>;
  return <div className="space-y-5">
    <div className="flex items-end justify-between gap-3"><div className="space-y-1"><Label htmlFor="nfse-month">Competência</Label><Input id="nfse-month" type="month" className="w-44" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} /></div>{canManageNF && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Nova NFS-e</Button>}</div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y py-4">
      <div><p className="text-xs text-muted-foreground uppercase">Faturamento • competência</p><p className="text-2xl font-bold tabular-nums text-primary">{formatCurrency(summary.gross)}</p><p className="text-xs text-muted-foreground">{summary.count} notas emitidas · após descontos/deduções {formatCurrency(summary.revenue)}</p></div>
      <div><p className="text-xs text-muted-foreground uppercase">Previsão tributária • competência</p><p className="text-2xl font-bold tabular-nums text-destructive">{formatCurrency(summary.tax)}</p><p className="text-xs text-muted-foreground">Retidos {formatCurrency(summary.withheld)} · A recolher {formatCurrency(summary.payableTax)}</p></div>
      <div><p className="text-xs text-muted-foreground uppercase">Caixa recebido • mês do recebimento</p><p className="text-2xl font-bold tabular-nums">{formatCurrency(summary.receivedInMonth)}</p><p className="text-xs text-muted-foreground">Saldo a receber das notas da competência {formatCurrency(summary.outstanding)}</p></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b pb-4">
      <div><p className="text-xs text-muted-foreground">Margem por competência • serviços cadastrados</p><p className="text-xl font-semibold tabular-nums">{summary.margin === null ? "—" : `${summary.margin.toFixed(1)}%`}</p><p className="text-xs text-muted-foreground">{month.split("-").reverse().join("/")} · {summary.costsConfirmed ? `Resultado ${formatCurrency(summary.profit ?? 0)} · Custos ${formatCurrency(summary.cost)}` : "Custos por competência não conferidos"}</p></div>
      {canViewAll ? <CashMargin month={month} /> : <div><p className="text-xs text-muted-foreground">Margem operacional • caixa • empresa</p><p className="text-xl font-semibold">—</p><p className="text-xs text-muted-foreground">Restrita aos perfis com acesso financeiro</p></div>}
    </div>
    <div className="flex items-center justify-between"><h3 className="font-semibold">Notas fiscais de serviço</h3><Badge variant="outline">{period.length} notas</Badge></div>
    {period.length === 0 ? <div className="text-center text-muted-foreground py-10"><FileText className="h-9 w-9 mx-auto mb-3 opacity-40" /><p>Nenhuma NFS-e nesta competência</p></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-3 text-left">Número / Tomador</th><th className="p-3 text-left">Serviço</th><th className="p-3 text-left">Situação</th><th className="p-3 text-right">Bruto</th><th className="p-3 text-right">Líquido</th><th className="p-3 text-right">Recebido vinculado</th><th className="p-3 text-right">Ações</th></tr></thead><tbody>{period.map(i => <tr key={i.id} className="border-b"><td className="p-3"><Button variant="link" className="p-0 h-auto" onClick={() => setDetailId(i.id)}>{i.number}</Button><p>{i.customer_name}</p><p className="text-xs text-muted-foreground">{i.customer_document}</p></td><td className="p-3 min-w-40 max-w-64"><p className="break-words">{i.service_description}</p>{i.os_number && <p className="text-muted-foreground text-xs">OS {i.os_number}</p>}</td><td className="p-3"><Badge variant="outline">{i.status}</Badge></td><td className="p-3 text-right tabular-nums whitespace-nowrap">{formatCurrency(i.gross_value)}</td><td className="p-3 text-right tabular-nums whitespace-nowrap">{formatCurrency(serviceInvoiceAmounts(i).net)}</td><td className="p-3 text-right tabular-nums whitespace-nowrap">{formatCurrency(data.receipts.filter(r => r.invoice_id === i.id).reduce((s, r) => s + r.amount, 0))}</td><td className="p-3"><div className="flex gap-1 justify-end"><Button variant="ghost" size="icon" aria-label={`Detalhes e vínculos NFS-e ${i.number}`} title="Detalhes e vínculos" onClick={() => setDetailId(i.id)}><Link2 className="h-4 w-4" /></Button>{canManageNF && <Button variant="ghost" size="icon" aria-label={`Editar NFS-e ${i.number}`} title="Editar NFS-e" onClick={() => { setEditing(i); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>}</div></td></tr>)}</tbody></table></div>}
    <ServiceInvoiceForm open={open} onClose={() => { setOpen(false); setEditing(null); }} initial={editing} month={month} onSave={data.save} />
    <ServiceInvoiceDetails invoice={details} receipts={data.receipts} attachments={data.attachments} refresh={data.refresh} onClose={() => setDetailId(null)} />
  </div>;
}