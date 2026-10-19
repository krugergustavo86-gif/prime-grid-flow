import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Link2, Loader2, Trash2, Upload, Search } from "lucide-react";
import { formatCurrency, formatDateBR } from "@/utils/formatters";
import { serviceInvoiceAmounts, type ServiceInvoice, type ServiceReceipt } from "@/utils/serviceInvoiceTotals";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type ReceiptOption = { id: string; date: string; description: string; value: number; available: number };
type OSOption = Pick<Tables<"ordens_servico">, "numero" | "cliente" | "area">;
export function ServiceInvoiceDetails({ invoice, receipts, attachments, onClose, refresh }: {
  invoice: ServiceInvoice | null; receipts: ServiceReceipt[]; attachments: Tables<"service_invoice_attachments">[]; onClose: () => void; refresh: () => Promise<void>;
}) {
  const { canManageNF, user } = useAuth();
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ReceiptOption[]>([]);
  const [osOptions, setOsOptions] = useState<OSOption[]>([]);
  const [osSearch, setOsSearch] = useState("");
  const [chosen, setChosen] = useState<ReceiptOption | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setSearch(""); setOsSearch(""); setOptions([]); setOsOptions([]); setChosen(null); setAmount(""); }, [invoice?.id]);
  if (!invoice) return null;
  const linked = receipts.filter(r => r.invoice_id === invoice.id);
  const files = attachments.filter(a => a.invoice_id === invoice.id);
  const amounts = serviceInvoiceAmounts(invoice);
  const received = linked.reduce((s, r) => s + r.amount, 0);
  const run = async (action: () => Promise<void>) => { setBusy(true); try { await action(); } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível concluir"); } finally { setBusy(false); } };
  const searchReceipts = () => run(async () => {
    if (search.trim().length < 2) { toast.error("Digite ao menos 2 caracteres"); return; }
    const { data, error } = await supabase.rpc("search_service_receipts", { _search: search.trim() });
    if (error) throw error;
    setOptions((data || []).filter(r => r.available > 0)); setChosen(null);
  });
  const linkReceipt = () => run(async () => {
    const value = Number(amount);
    if (!chosen || !Number.isFinite(value) || value <= 0 || value > chosen.available || value > amounts.net - received) { toast.error("Informe um valor dentro do saldo da nota e do recebimento"); return; }
    const { error } = await supabase.from("service_invoice_receipts").insert({ id: crypto.randomUUID(), invoice_id: invoice.id, transaction_id: chosen.id, amount: value, created_by: user?.id });
    if (error) throw error;
    setChosen(null); setOptions([]); setAmount(""); await refresh(); toast.success("Recebimento vinculado");
  });
  const upload = (files: FileList | null) => run(async () => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!/\.(pdf|xml)$/i.test(file.name)) throw new Error("Anexe apenas PDF ou XML");
      const path = `nfse/${invoice.id}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`;
      const uploaded = await supabase.storage.from("invoices").upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (uploaded.error) throw uploaded.error;
      const { error } = await supabase.from("service_invoice_attachments").insert({ id: crypto.randomUUID(), invoice_id: invoice.id, path, name: file.name });
      if (error) { await supabase.storage.from("invoices").remove([path]); throw error; }
    }
    await refresh(); toast.success("Anexos salvos");
  });
  const linkOS = (numero: string | null) => run(async () => {
    const { error } = await supabase.from("service_invoices").update({ os_number: numero }).eq("id", invoice.id);
    if (error) throw error;
    await refresh(); setOsOptions([]); toast.success(numero ? "OS vinculada" : "OS desvinculada");
  });
  return <Dialog open={Boolean(invoice)} onOpenChange={v => { if (!v && !busy) onClose(); }}><DialogContent className="max-w-3xl w-[calc(100%-2rem)] max-h-[90dvh] flex flex-col">
    <DialogHeader><DialogTitle>NFS-e {invoice.number}</DialogTitle><DialogDescription>{invoice.customer_name} · {invoice.status}</DialogDescription></DialogHeader>
    <div className="grid grid-cols-3 gap-2 border-b pb-4 text-sm"><p>Bruto<strong className="block tabular-nums">{formatCurrency(invoice.gross_value)}</strong></p><p>Líquido<strong className="block tabular-nums">{formatCurrency(amounts.net)}</strong></p><p>A receber<strong className="block tabular-nums text-primary">{formatCurrency(amounts.net - received)}</strong></p></div>
    <Tabs defaultValue="dados" className="overflow-y-auto min-h-0"><TabsList className="w-full grid grid-cols-4"><TabsTrigger value="dados">Nota</TabsTrigger><TabsTrigger value="os">OS</TabsTrigger><TabsTrigger value="recebimentos">Recebimentos</TabsTrigger><TabsTrigger value="anexos">Anexos</TabsTrigger></TabsList>
      <TabsContent value="dados"><dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm py-3">{[["Prestador", `${invoice.provider_name} · ${invoice.provider_document}`], ["Tomador", `${invoice.customer_name} · ${invoice.customer_document}`], ["Município", invoice.municipality], ["Serviço", `${invoice.service_code} · ${invoice.service_description}`], ["Emissão", formatDateBR(invoice.issue_date)], ["Competência", invoice.competence.slice(0, 7).split("-").reverse().join("/")], ["Descontos / Deduções", `${formatCurrency(invoice.discounts)} / ${formatCurrency(invoice.deductions)}`], ["ISSQN", `${invoice.iss_rate}% · ${formatCurrency(amounts.iss)}${invoice.iss_withheld ? " · Retido" : " · A recolher"}`], ["PIS / COFINS", `${formatCurrency(amounts.pis)}${invoice.pis_withheld ? " retido" : ""} / ${formatCurrency(amounts.cofins)}${invoice.cofins_withheld ? " retido" : ""}`], ["Outras retenções", `${formatCurrency(invoice.other_withholdings)} · ${invoice.other_withholdings_notes}`], ["Custos por competência", invoice.competence_cost_confirmed ? formatCurrency(invoice.competence_cost) : "Não conferidos"], ["Observações", invoice.notes || "—"]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl></TabsContent>
      <TabsContent value="os" className="space-y-3 py-3"><div className="flex items-center justify-between"><p>OS vinculada: <strong>{invoice.os_number || "—"}</strong></p>{canManageNF && invoice.os_number && <Button variant="ghost" size="icon" aria-label="Desvincular OS" disabled={busy} onClick={() => linkOS(null)}><Trash2 className="h-4 w-4" /></Button>}</div>{canManageNF && <><div className="flex gap-2"><Input aria-label="Buscar OS" placeholder="Número da OS" value={osSearch} onChange={e => setOsSearch(e.target.value)} /><Button size="icon" variant="outline" aria-label="Pesquisar OS" disabled={busy} onClick={() => run(async () => { if (!osSearch.trim()) return; const { data, error } = await supabase.from("ordens_servico").select("numero,cliente,area").ilike("numero", `%${osSearch.trim()}%`).order("numero").limit(30); if (error) throw error; setOsOptions(data || []); if (!data?.length) toast.info("Nenhuma OS encontrada"); })}><Search className="h-4 w-4" /></Button></div>{osOptions.map(o => <div key={o.numero} className="flex justify-between items-center gap-2 border-b py-2 text-sm"><p className="break-words">{o.numero} · {o.cliente} · {o.area}</p><Button size="icon" variant="outline" aria-label={`Vincular OS ${o.numero}`} disabled={busy} onClick={() => linkOS(o.numero)}><Link2 className="h-4 w-4" /></Button></div>)}</>}</TabsContent>
      <TabsContent value="recebimentos" className="space-y-3 py-3">{linked.length === 0 && <p className="text-muted-foreground text-sm">Nenhum recebimento vinculado</p>}{linked.map(r => <div key={r.id} className="flex items-center justify-between gap-2 border-b pb-2 text-sm"><p className="break-words">{formatDateBR(r.date)} · {r.description}<strong className="block">{formatCurrency(r.amount)}</strong></p>{canManageNF && <Button size="icon" variant="ghost" aria-label={`Desvincular recebimento ${r.description}`} disabled={busy} onClick={() => run(async () => { const { error } = await supabase.from("service_invoice_receipts").delete().eq("id", r.id); if (error) throw error; await refresh(); toast.success("Vínculo removido"); })}><Trash2 className="h-4 w-4" /></Button>}</div>)}
        {canManageNF && invoice.status === "Emitida" && <><div className="flex gap-2"><Input aria-label="Buscar recebimento existente" placeholder="Cliente ou número da OS" value={search} onChange={e => setSearch(e.target.value)} /><Button size="icon" variant="outline" aria-label="Pesquisar recebimentos" disabled={busy} onClick={searchReceipts}><Search className="h-4 w-4" /></Button></div>{options.map(o => <Button key={o.id} variant={chosen?.id === o.id ? "secondary" : "ghost"} className="w-full h-auto text-left justify-start whitespace-normal" onClick={() => { setChosen(o); setAmount(String(Math.min(o.available, amounts.net - received))); }}>{formatDateBR(o.date)} · {o.description} · Disponível {formatCurrency(o.available)}</Button>)}{chosen && <div className="flex gap-2 items-end"><div className="flex-1"><Label htmlFor="nfse-allocation">Valor vinculado (R$)</Label><Input id="nfse-allocation" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div><Button disabled={busy} onClick={linkReceipt}><Link2 className="h-4 w-4 mr-2" />Vincular</Button></div>}</>}
      </TabsContent>
      <TabsContent value="anexos" className="space-y-3 py-3">{files.length === 0 && <p className="text-muted-foreground text-sm">Nenhum anexo</p>}{files.map(f => <div key={f.id} className="flex gap-2 items-center"><Button variant="ghost" className="min-w-0 flex-1 justify-start" onClick={() => run(async () => { const { data, error } = await supabase.storage.from("invoices").createSignedUrl(f.path, 60); if (error || !data?.signedUrl) throw new Error("Não foi possível abrir o anexo"); window.open(data.signedUrl, "_blank", "noopener,noreferrer"); })}><FileText className="h-4 w-4 mr-2 shrink-0" /><span className="truncate">{f.name}</span></Button>{canManageNF && <Button size="icon" variant="ghost" disabled={busy} aria-label={`Remover anexo ${f.name}`} onClick={() => run(async () => { const { error } = await supabase.storage.from("invoices").remove([f.path]); if (error) throw error; const removed = await supabase.from("service_invoice_attachments").delete().eq("id", f.id); if (removed.error) throw removed.error; await refresh(); })}><Trash2 className="h-4 w-4" /></Button>}</div>)}{canManageNF && <div className="space-y-1"><Label htmlFor="nfse-files" className="flex gap-2 items-center"><Upload className="h-4 w-4" />PDF / XML</Label><Input id="nfse-files" type="file" multiple accept=".pdf,.xml" disabled={busy} onChange={e => { void upload(e.target.files); e.target.value = ""; }} /></div>}</TabsContent>
    </Tabs>{busy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
  </DialogContent></Dialog>;
}