import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { emptyServiceDraft, serviceInvoiceAmounts, validateServiceDraft, type ServiceInvoice, type ServiceInvoiceDraft } from "@/utils/serviceInvoiceTotals";
import { formatCurrency } from "@/utils/formatters";

export function ServiceInvoiceForm({ open, onClose, initial, month, onSave }: {
  open: boolean; onClose: () => void; initial: ServiceInvoice | null; month: string;
  onSave: (draft: ServiceInvoiceDraft, id?: string) => Promise<ServiceInvoice | null>;
}) {
  const [draft, setDraft] = useState(() => emptyServiceDraft(month));
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState("identificacao");
  useEffect(() => { if (open) { setDraft(initial || emptyServiceDraft(month)); setSection("identificacao"); } }, [open, initial, month]);
  const update = <K extends keyof ServiceInvoiceDraft>(key: K, value: ServiceInvoiceDraft[K]) => setDraft(d => ({ ...d, [key]: value }));
  const text = (key: keyof ServiceInvoiceDraft, label: string, required = false, type = "text") => (
    <div className="space-y-1 min-w-0"><Label htmlFor={`nfse-${key}`}>{label}{required ? " *" : ""}</Label><Input id={`nfse-${key}`} type={type} value={String(draft[key] ?? "")} onChange={e => update(key, e.target.value)} required={required} /></div>
  );
  const number = (key: keyof ServiceInvoiceDraft, label: string) => (
    <div className="space-y-1 min-w-0"><Label htmlFor={`nfse-${key}`}>{label}</Label><Input id={`nfse-${key}`} type="number" min="0" step="0.01" value={Number(draft[key])} onChange={e => update(key, Number(e.target.value))} /></div>
  );
  const check = (key: "iss_withheld" | "pis_withheld" | "cofins_withheld" | "competence_cost_confirmed", label: string) => (
    <div className="flex items-center gap-2"><Checkbox id={`nfse-${key}`} checked={draft[key]} onCheckedChange={v => update(key, v === true)} /><Label htmlFor={`nfse-${key}`}>{label}</Label></div>
  );
  const amounts = serviceInvoiceAmounts(draft);
  const submit = async () => {
    const error = validateServiceDraft(draft);
    if (error) { toast.error(error); return; }
    setSaving(true);
    try { if (await onSave(draft, initial?.id)) { toast.success("NFS-e salva"); onClose(); } }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={v => { if (!v && !saving) onClose(); }}>
    <DialogContent className="max-w-3xl w-[calc(100%-2rem)] max-h-[90dvh] flex flex-col">
      <DialogHeader><DialogTitle>{initial ? "Editar NFS-e" : "Nova NFS-e"}</DialogTitle><DialogDescription>Nota fiscal de serviço</DialogDescription></DialogHeader>
      <Tabs value={section} onValueChange={setSection} className="min-h-0 flex-1 overflow-y-auto">
        <TabsList className="grid grid-cols-3 w-full"><TabsTrigger value="identificacao">Identificação</TabsTrigger><TabsTrigger value="tributos">Tributos</TabsTrigger><TabsTrigger value="competencia">Competência</TabsTrigger></TabsList>
        <TabsContent value="identificacao" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{text("number", "Número da NFS-e", true)}<div className="space-y-1"><Label>Situação</Label><Select value={draft.status} onValueChange={v => update("status", v)}><SelectTrigger aria-label="Situação"><SelectValue /></SelectTrigger><SelectContent>{["Emitida", "Cancelada", "Substituída"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>{text("provider_name", "Prestador", true)}{text("provider_document", "CPF/CNPJ do prestador", true)}{text("customer_name", "Tomador", true)}{text("customer_document", "CPF/CNPJ do tomador", true)}{text("municipality", "Município de incidência do ISS", true)}{text("service_code", "Código do serviço", true)}{text("issue_date", "Emissão", true, "date")}</div>
          <div className="space-y-1"><Label htmlFor="nfse-service_description">Descrição do serviço *</Label><Textarea id="nfse-service_description" value={draft.service_description} onChange={e => update("service_description", e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="nfse-notes">Observações</Label><Textarea id="nfse-notes" value={draft.notes} onChange={e => update("notes", e.target.value)} /></div>
        </TabsContent>
        <TabsContent value="tributos" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{number("gross_value", "Valor bruto (R$)")}{number("discounts", "Descontos (R$)")}{number("deductions", "Deduções (R$)")}{number("iss_base", "Base ISSQN (R$)")}{number("iss_rate", "Alíquota ISSQN (%)")}<div className="self-end pb-3">{check("iss_withheld", "ISS retido pelo tomador")}</div>{number("pis_rate", "PIS (%)")}<div className="self-end pb-3">{check("pis_withheld", "PIS retido")}</div><p className="self-center text-sm">PIS: {formatCurrency(amounts.pis)}</p>{number("cofins_rate", "COFINS (%)")}<div className="self-end pb-3">{check("cofins_withheld", "COFINS retido")}</div><p className="self-center text-sm">COFINS: {formatCurrency(amounts.cofins)}</p>{number("other_withholdings", "Outras retenções (R$)")}</div>
          <div className="space-y-1"><Label htmlFor="nfse-other_withholdings_notes">Detalhamento das outras retenções</Label><Textarea id="nfse-other_withholdings_notes" value={draft.other_withholdings_notes} onChange={e => update("other_withholdings_notes", e.target.value)} placeholder="IRRF, CSLL, INSS…" /></div>
          <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm"><p>ISSQN <strong className="block tabular-nums">{formatCurrency(amounts.iss)}</strong></p><p>Retido pelo tomador <strong className="block tabular-nums">{formatCurrency(amounts.withheld)}</strong></p><p>A recolher <strong className="block tabular-nums">{formatCurrency(amounts.payableTax)}</strong></p><p>Líquido a receber <strong className="block text-primary text-lg tabular-nums" data-testid="nfse-net-preview">{formatCurrency(amounts.net)}</strong></p></div>
        </TabsContent>
        <TabsContent value="competencia" className="space-y-4"><div className="space-y-1"><Label htmlFor="nfse-competence">Competência *</Label><Input id="nfse-competence" type="month" value={draft.competence.slice(0, 7)} onChange={e => update("competence", e.target.value ? `${e.target.value}-01` : "")} /></div>{number("competence_cost", "Custos atribuídos à nota (R$)")}{check("competence_cost_confirmed", "Custos por competência conferidos")}</TabsContent>
      </Tabs>
      <DialogFooter><Button variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button disabled={saving} onClick={submit}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar NFS-e</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}