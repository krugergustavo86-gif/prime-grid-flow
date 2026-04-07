import { useState } from "react";
import { Receivable, DoubtfulCredit, CashEntry, ReceivableType, ReceivableStatus } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  receivables: Receivable[];
  doubtfulCredits: DoubtfulCredit[];
  cashEntries: CashEntry[];
  addReceivable: (r: Omit<Receivable, "id">) => void;
  updateReceivable: (id: string, u: Partial<Receivable>) => void;
  deleteReceivable: (id: string) => void;
  addDoubtfulCredit: (d: Omit<DoubtfulCredit, "id">) => void;
  updateDoubtfulCredit: (id: string, u: Partial<DoubtfulCredit>) => void;
  deleteDoubtfulCredit: (id: string) => void;
  updateCashEntry: (id: string, u: Partial<CashEntry>) => void;
}

const TYPES: ReceivableType[] = ["Cheque", "Boleto", "Serviço", "Solar", "Acerto", "Outro"];
const STATUSES: ReceivableStatus[] = ["A vencer", "Vencido", "Recebido"];

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    "A vencer": "bg-chart-blue-medium/10 text-chart-blue-medium border-chart-blue-medium/20",
    "Vencido": "bg-destructive/10 text-destructive border-destructive/20",
    "Recebido": "bg-success/10 text-success border-success/20",
  };
  return <Badge variant="outline" className={colors[status] || ""}>{status}</Badge>;
}

export function ReceivablesTab(props: Props) {
  const { receivables, doubtfulCredits, cashEntries } = props;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Receivable | null>(null);

  const totalReceivables = receivables.reduce((s, r) => s + r.value, 0);
  const totalDoubtful = doubtfulCredits.reduce((s, d) => s + d.value, 0);

  const handleSave = (data: Omit<Receivable, "id">) => {
    if (editing) {
      props.updateReceivable(editing.id, data);
      toast.success("Recebível atualizado");
    } else {
      props.addReceivable(data);
      toast.success("Recebível adicionado");
    }
    setEditing(null);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Receivables Table */}
      <div className="bg-card rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-foreground">Recebíveis</h3>
          <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Descrição</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {receivables.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">{r.description}</td>
                  <td className="p-3 text-right tabular-nums font-medium">{formatCurrency(r.value)}</td>
                  <td className="p-3 hidden md:table-cell">{r.type}</td>
                  <td className="p-3">{statusBadge(r.status)}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setModalOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {r.status !== "Recebido" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => { props.updateReceivable(r.id, { status: "Recebido" }); toast.success("Marcado como recebido"); }}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir recebível?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { props.deleteReceivable(r.id); toast.success("Recebível excluído"); }}>Excluir</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                <td className="p-3">Total</td>
                <td className="p-3 text-right tabular-nums">{formatCurrency(totalReceivables)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Doubtful Credits */}
      <div className="bg-warning/30 rounded-lg border border-warning-foreground/20">
        <div className="flex items-center gap-2 p-4 border-b border-warning-foreground/20">
          <AlertTriangle className="h-4 w-4 text-warning-foreground" />
          <h3 className="font-semibold text-warning-foreground">Crédito de Liquidação Duvidosa</h3>
        </div>
        <div className="p-4 space-y-2">
          {doubtfulCredits.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-warning-foreground/10 last:border-0">
              <div>
                <span className="font-medium text-foreground">{d.description}</span>
                {d.responsible && <span className="text-xs text-muted-foreground ml-2">({d.responsible})</span>}
              </div>
              <span className="font-semibold tabular-nums text-warning-foreground">{formatCurrency(d.value)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 font-bold">
            <span className="text-warning-foreground">Total Duvidoso</span>
            <span className="tabular-nums text-warning-foreground">{formatCurrency(totalDoubtful)}</span>
          </div>
        </div>
      </div>

      {/* Cash */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-semibold text-foreground mb-3">Caixa</h3>
        {cashEntries.map((c) => (
          <div key={c.id} className="flex items-center justify-between">
            <span>{c.description} <span className="text-xs text-muted-foreground">({c.refDate})</span></span>
            <span className="font-bold tabular-nums text-primary">{formatCurrency(c.balance)}</span>
          </div>
        ))}
      </div>

      {/* Modal */}
      <ReceivableModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} initial={editing} />
    </div>
  );
}

function ReceivableModal({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (d: Omit<Receivable, "id">) => void; initial: Receivable | null }) {
  const [description, setDescription] = useState(initial?.description || "");
  const [value, setValue] = useState(initial?.value?.toString() || "");
  const [type, setType] = useState<ReceivableType>(initial?.type || "Outro");
  const [status, setStatus] = useState<ReceivableStatus>(initial?.status || "A vencer");
  const [dueDate, setDueDate] = useState(initial?.dueDate || "");
  const [responsible, setResponsible] = useState(initial?.responsible || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  // Reset when modal opens
  useState(() => {
    if (open) {
      setDescription(initial?.description || "");
      setValue(initial?.value?.toString() || "");
      setType(initial?.type || "Outro");
      setStatus(initial?.status || "A vencer");
      setDueDate(initial?.dueDate || "");
      setResponsible(initial?.responsible || "");
      setNotes(initial?.notes || "");
    }
  });

  const handleSubmit = () => {
    if (!description || !value) { toast.error("Preencha os campos obrigatórios"); return; }
    onSave({ description, value: parseFloat(value) || 0, type, status, dueDate: dueDate || undefined, responsible: responsible || undefined, notes: notes || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} Recebível</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição *</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div><Label>Valor (R$) *</Label><Input type="number" value={value} onChange={e => setValue(e.target.value)} /></div>
          <div><Label>Tipo</Label>
            <Select value={type} onValueChange={v => setType(v as ReceivableType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as ReceivableStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Vencimento</Label><Input value={dueDate} onChange={e => setDueDate(e.target.value)} placeholder="DD/MM/AAAA" /></div>
          <div><Label>Responsável</Label><Input value={responsible} onChange={e => setResponsible(e.target.value)} /></div>
          <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
