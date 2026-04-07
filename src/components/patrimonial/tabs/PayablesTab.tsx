import { useState } from "react";
import { Payable, PayableStatus } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  payables: Payable[];
  addPayable: (p: Omit<Payable, "id">) => void;
  updatePayable: (id: string, u: Partial<Payable>) => void;
  deletePayable: (id: string) => void;
  readOnly?: boolean;
}

const STATUSES: PayableStatus[] = ["A vencer", "Vencido", "Agendado", "Pago"];

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    "A vencer": "bg-chart-blue-medium/10 text-chart-blue-medium border-chart-blue-medium/20",
    "Vencido": "bg-destructive/10 text-destructive border-destructive/20",
    "Agendado": "bg-warning text-warning-foreground border-warning-foreground/20",
    "Pago": "bg-success/10 text-success border-success/20",
  };
  return <Badge variant="outline" className={colors[status] || ""}>{status}</Badge>;
}

export function PayablesTab({ payables, addPayable, updatePayable, deletePayable, readOnly }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Payable | null>(null);
  const [payModalPayable, setPayModalPayable] = useState<Payable | null>(null);
  const [payValue, setPayValue] = useState("");

  const activePays = payables.filter(p => p.status !== "Pago");
  const total = activePays.reduce((s, p) => s + p.value, 0);

  const handleSave = (data: Omit<Payable, "id">) => {
    if (editing) {
      updatePayable(editing.id, data);
      toast.success("Conta atualizada");
    } else {
      addPayable(data);
      toast.success("Conta adicionada");
    }
    setEditing(null);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-foreground">Contas a Pagar</h3>
          {!readOnly && (
            <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Descrição</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Responsável</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                {!readOnly && <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {payables.map((p) => (
                <tr key={p.id} className={`border-b hover:bg-muted/30 ${p.status === "Pago" ? "opacity-50" : ""}`}>
                  <td className="p-3">
                    {p.description}
                    {p.dueDate && <span className="text-xs text-muted-foreground ml-2">({p.dueDate})</span>}
                  </td>
                  <td className="p-3 text-right tabular-nums font-medium">{formatCurrency(p.value)}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{p.responsible}</td>
                  <td className="p-3">{statusBadge(p.status)}</td>
                  {!readOnly && (
                  <td className="p-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(p); setModalOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {p.status !== "Pago" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => { updatePayable(p.id, { status: "Pago" }); toast.success("Marcado como pago"); }}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir conta?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { deletePayable(p.id); toast.success("Conta excluída"); }}>Excluir</AlertDialogAction></AlertDialogFooter>
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
                <td className="p-3">Total (ativas)</td>
                <td className="p-3 text-right tabular-nums text-destructive">{formatCurrency(total)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <PayableModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} initial={editing} />
    </div>
  );
}

function PayableModal({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (d: Omit<Payable, "id">) => void; initial: Payable | null }) {
  const [description, setDescription] = useState(initial?.description || "");
  const [value, setValue] = useState(initial?.value?.toString() || "");
  const [dueDate, setDueDate] = useState(initial?.dueDate || "");
  const [responsible, setResponsible] = useState(initial?.responsible || "");
  const [status, setStatus] = useState<PayableStatus>(initial?.status || "A vencer");
  const [notes, setNotes] = useState(initial?.notes || "");

  useState(() => {
    if (open) {
      setDescription(initial?.description || "");
      setValue(initial?.value?.toString() || "");
      setDueDate(initial?.dueDate || "");
      setResponsible(initial?.responsible || "");
      setStatus(initial?.status || "A vencer");
      setNotes(initial?.notes || "");
    }
  });

  const handleSubmit = () => {
    if (!description || !value || !responsible) { toast.error("Preencha os campos obrigatórios"); return; }
    onSave({
      description, value: parseFloat(value) || 0,
      dueDate: dueDate || undefined,
      responsible, status,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Editar" : "Nova"} Conta a Pagar</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição *</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div><Label>Valor (R$) *</Label><Input type="number" value={value} onChange={e => setValue(e.target.value)} /></div>
          <div><Label>Vencimento</Label><Input value={dueDate} onChange={e => setDueDate(e.target.value)} placeholder="DD/MM/AAAA" /></div>
          <div><Label>Responsável *</Label><Input value={responsible} onChange={e => setResponsible(e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as PayableStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>
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
