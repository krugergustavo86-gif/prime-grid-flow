import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, FileText, Upload, ExternalLink, Calculator, Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  number: string;
  type_name: string;
  type_id: string | null;
  client_name: string;
  value: number;
  issue_date: string;
  attachment_url: string | null;
  attachment_name: string | null;
  notes: string | null;
  tax_rate: number;
  month: string;
  created_at: string;
}

interface InvoiceType {
  id: string;
  name: string;
}

export default function NFControlPage() {
  const { canManageNF, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [types, setTypes] = useState<InvoiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invoicesRes, typesRes] = await Promise.all([
      supabase.from("invoices").select("*").eq("month", selectedMonth).order("issue_date", { ascending: false }),
      supabase.from("invoice_types").select("*").order("name"),
    ]);
    setInvoices((invoicesRes.data as Invoice[]) || []);
    setTypes((typesRes.data as InvoiceType[]) || []);
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalNF = invoices.reduce((s, i) => s + Number(i.value), 0);
  const taxPreview = totalNF * 0.15;

  // Group by type
  const byType: Record<string, { count: number; total: number }> = {};
  invoices.forEach(i => {
    if (!byType[i.type_name]) byType[i.type_name] = { count: 0, total: 0 };
    byType[i.type_name].count++;
    byType[i.type_name].total += Number(i.value);
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return { value: `${m}/2026`, label: ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"][i] };
  });

  const handleSave = async (data: {
    number: string; type_name: string; type_id: string | null; client_name: string;
    value: number; issue_date: string; notes: string; attachment_url: string | null; attachment_name: string | null;
  }) => {
    if (editing) {
      const { error } = await supabase.from("invoices").update({
        ...data, month: selectedMonth, updated_at: new Date().toISOString(),
      }).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
      toast.success("NF atualizada");
    } else {
      const { error } = await supabase.from("invoices").insert({
        ...data, month: selectedMonth, created_by: user?.id,
      });
      if (error) { toast.error("Erro ao salvar: " + error.message); return; }
      toast.success("NF cadastrada com sucesso");
    }
    setEditing(null);
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("NF excluída");
    fetchData();
  };

  const handleAddType = async (name: string) => {
    const { error } = await supabase.from("invoice_types").insert({ name });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Tipo adicionado");
    setTypeModalOpen(false);
    fetchData();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Controle de NF Emitidas" />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 space-y-4">
        {/* Month selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {months.map(m => (
            <Button key={m.value} size="sm" variant={selectedMonth === m.value ? "default" : "outline"} onClick={() => setSelectedMonth(m.value)}>
              {m.label}
            </Button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total NF Emitidas</p>
            <p className="text-xl font-bold tabular-nums text-primary">{formatCurrency(totalNF)}</p>
            <p className="text-xs text-muted-foreground">{invoices.length} notas</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-1 mb-1">
              <Calculator className="h-3.5 w-3.5 text-destructive" />
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Previsão Impostos (15%)</p>
            </div>
            <p className="text-xl font-bold tabular-nums text-destructive">{formatCurrency(taxPreview)}</p>
          </div>
          <div className="bg-card rounded-lg border p-4 col-span-2 lg:col-span-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Por Tipo</p>
            <div className="space-y-1 mt-2">
              {Object.entries(byType).map(([name, data]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{name} ({data.count})</span>
                  <span className="tabular-nums font-medium">{formatCurrency(data.total)}</span>
                </div>
              ))}
              {Object.keys(byType).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma NF neste mês</p>}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-foreground">Notas Fiscais</h3>
            <div className="flex gap-2">
              {canManageNF && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setTypeModalOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-1" /> Tipo
                  </Button>
                  <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Nova NF
                  </Button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Nenhuma NF emitida neste mês</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Nº</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Data</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Anexo</th>
                    {canManageNF && <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{inv.number}</td>
                      <td className="p-3"><Badge variant="outline">{inv.type_name}</Badge></td>
                      <td className="p-3">{inv.client_name}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{formatCurrency(Number(inv.value))}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{new Date(inv.issue_date + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                      <td className="p-3 hidden md:table-cell">
                        {inv.attachment_url ? (
                          <a href={inv.attachment_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                            <ExternalLink className="h-3 w-3" /> {inv.attachment_name || "Arquivo"}
                          </a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      {canManageNF && (
                        <td className="p-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(inv); setModalOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Excluir NF?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(inv.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td className="p-3" colSpan={3}>Total</td>
                    <td className="p-3 text-right tabular-nums text-primary">{formatCurrency(totalNF)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <InvoiceModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} initial={editing} types={types} />
      <AddTypeModal open={typeModalOpen} onClose={() => setTypeModalOpen(false)} onSave={handleAddType} />
    </div>
  );
}

function InvoiceModal({ open, onClose, onSave, initial, types }: {
  open: boolean; onClose: () => void;
  onSave: (d: { number: string; type_name: string; type_id: string | null; client_name: string; value: number; issue_date: string; notes: string; attachment_url: string | null; attachment_name: string | null }) => void;
  initial: Invoice | null; types: InvoiceType[];
}) {
  const [number, setNumber] = useState("");
  const [typeName, setTypeName] = useState("");
  const [typeId, setTypeId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [value, setValue] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNumber(initial?.number || "");
      const selectedType = types.find(t => t.name === initial?.type_name);
      setTypeName(initial?.type_name || (types[0]?.name || ""));
      setTypeId(selectedType?.id || types[0]?.id || null);
      setClientName(initial?.client_name || "");
      setValue(initial?.value?.toString() || "");
      setIssueDate(initial?.issue_date || new Date().toISOString().slice(0, 10));
      setNotes(initial?.notes || "");
      setAttachmentUrl(initial?.attachment_url || null);
      setAttachmentName(initial?.attachment_name || null);
      setFile(null);
    }
  }, [open, initial, types]);

  const handleTypeChange = (typeIdValue: string) => {
    const t = types.find(tp => tp.id === typeIdValue);
    if (t) { setTypeId(t.id); setTypeName(t.name); }
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("invoices").upload(path, file);
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("invoices").getPublicUrl(path);
    setAttachmentUrl(publicUrl);
    setAttachmentName(file.name);
    setUploading(false);
    toast.success("Arquivo anexado");
  };

  const handleSubmit = async () => {
    if (!number || !clientName || !value) { toast.error("Preencha os campos obrigatórios"); return; }
    if (file && !attachmentUrl) {
      await handleFileUpload();
    }
    onSave({
      number, type_name: typeName, type_id: typeId, client_name: clientName,
      value: parseFloat(value) || 0, issue_date: issueDate,
      notes, attachment_url: attachmentUrl, attachment_name: attachmentName,
    });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Editar" : "Nova"} Nota Fiscal</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div><Label>Nº da NF *</Label><Input value={number} onChange={e => setNumber(e.target.value)} placeholder="001234" /></div>
          <div><Label>Tipo *</Label>
            <Select value={typeId || ""} onValueChange={handleTypeChange}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>{types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Cliente *</Label><Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome do cliente" /></div>
          <div><Label>Valor (R$) *</Label><Input type="number" value={value} onChange={e => setValue(e.target.value)} /></div>
          <div><Label>Data de Emissão</Label><Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
          <div>
            <Label>Anexo (PDF/Imagem)</Label>
            <div className="flex gap-2 mt-1">
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => { setFile(e.target.files?.[0] || null); setAttachmentUrl(null); }} />
              {file && !attachmentUrl && (
                <Button size="sm" variant="outline" onClick={handleFileUpload} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              )}
            </div>
            {attachmentUrl && <p className="text-xs text-success mt-1">✓ {attachmentName}</p>}
          </div>
          <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={uploading}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTypeModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>Novo Tipo de NF</DialogTitle></DialogHeader>
        <div><Label>Nome do tipo</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Locação" /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { if (name.trim()) onSave(name.trim()); }} disabled={!name.trim()}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
