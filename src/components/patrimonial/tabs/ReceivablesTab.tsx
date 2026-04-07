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
import { Plus, Pencil, Trash2, CheckCircle, AlertTriangle, ArrowUpCircle, ArrowDownCircle, DollarSign } from "lucide-react";
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
  readOnly?: boolean;
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
  const { receivables, doubtfulCredits, cashEntries, readOnly } = props;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Receivable | null>(null);
  const [cashModal, setCashModal] = useState<{ id: string; type: "add" | "withdraw" } | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [paymentModal, setPaymentModal] = useState<Receivable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const totalReceivables = receivables.reduce((s, r) => s + r.value, 0);
  const totalPaid = receivables.reduce((s, r) => s + r.paidValue, 0);
  const totalRemaining = totalReceivables - totalPaid;
  const totalDoubtful = doubtfulCredits.reduce((s, d) => s + d.value, 0);
  const totalCash = cashEntries.reduce((s, c) => s + c.balance, 0);

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

  const handlePayment = () => {
    if (!paymentModal || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Informe um valor válido"); return; }
    const newPaid = paymentModal.paidValue + amount;
    if (newPaid > paymentModal.value) { toast.error("Valor pago excede o valor total"); return; }
    const updates: Partial<Receivable> = { paidValue: newPaid };
    if (newPaid >= paymentModal.value) {
      updates.status = "Recebido";
    }
    props.updateReceivable(paymentModal.id, updates);
    toast.success(`Pagamento de ${formatCurrency(amount)} registrado`);
    setPaymentModal(null);
    setPaymentAmount("");
  };

  const handleCashOperation = () => {
    if (!cashModal || !cashAmount) return;
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Informe um valor válido"); return; }
    const entry = cashEntries.find(c => c.id === cashModal.id);
    if (!entry) return;
    const newBalance = cashModal.type === "add" ? entry.balance + amount : entry.balance - amount;
    if (newBalance < 0) { toast.error("Saldo insuficiente"); return; }
    props.updateCashEntry(cashModal.id, { balance: newBalance });
    toast.success(cashModal.type === "add" ? "Valor adicionado" : "Valor retirado");
    setCashModal(null);
    setCashAmount("");
  };

  return (
    <div className="space-y-6">
      {/* Receivables Table */}
      <div className="bg-card rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-foreground">Recebíveis</h3>
            <div className="flex gap-4 text-xs text-muted-foreground mt-1">
              <span>Total: {formatCurrency(totalReceivables)}</span>
              <span className="text-success">Pago: {formatCurrency(totalPaid)}</span>
              <span className="text-primary font-medium">Restante: {formatCurrency(totalRemaining)}</span>
            </div>
          </div>
          {!readOnly && (
            <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Descrição</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Valor Total</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Pago</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden md:table-cell">Restante</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                {!readOnly && <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {receivables.map((r) => {
                const remaining = r.value - r.paidValue;
                const pct = r.value > 0 ? Math.round((r.paidValue / r.value) * 100) : 0;
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">{r.description}</td>
                    <td className="p-3 text-right tabular-nums font-medium">{formatCurrency(r.value)}</td>
                    <td className="p-3 text-right tabular-nums">
                      <div className="flex flex-col items-end">
                        <span className="text-success font-medium">{formatCurrency(r.paidValue)}</span>
                        {r.paidValue > 0 && <span className="text-xs text-muted-foreground">{pct}%</span>}
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums font-medium hidden md:table-cell">{formatCurrency(remaining)}</td>
                    <td className="p-3 hidden md:table-cell">{r.type}</td>
                    <td className="p-3">{statusBadge(r.status)}</td>
                    {!readOnly && (
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {r.status !== "Recebido" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-success" title="Registrar pagamento" onClick={() => { setPaymentModal(r); setPaymentAmount(""); }}>
                            <DollarSign className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setModalOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {r.status !== "Recebido" ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-success" title="Marcar como recebido (total)" onClick={() => { props.updateReceivable(r.id, { status: "Recebido", paidValue: r.value }); toast.success("Marcado como recebido"); }}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-chart-blue-medium" title="Desfazer recebimento" onClick={() => { props.updateReceivable(r.id, { status: "A vencer" }); toast.success("Status revertido para A vencer"); }}>
                            <ArrowUpCircle className="h-3.5 w-3.5" />
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
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                <td className="p-3">Total</td>
                <td className="p-3 text-right tabular-nums">{formatCurrency(totalReceivables)}</td>
                <td className="p-3 text-right tabular-nums text-success">{formatCurrency(totalPaid)}</td>
                <td className="p-3 text-right tabular-nums hidden md:table-cell">{formatCurrency(totalRemaining)}</td>
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

      {/* Cash & Investments */}
      <div className="bg-card rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-foreground">Caixa e Investimentos</h3>
          <span className="text-sm font-bold tabular-nums text-primary">{formatCurrency(totalCash)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Descrição</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Observações</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Ref.</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Saldo</th>
                {!readOnly && <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {cashEntries.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.description}</td>
                  <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{c.notes || "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">{c.refDate}</td>
                  <td className="p-3 text-right tabular-nums font-bold text-primary">{formatCurrency(c.balance)}</td>
                  {!readOnly && (
                  <td className="p-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-chart-entrada" title="Adicionar valor" onClick={() => { setCashModal({ id: c.id, type: "add" }); setCashAmount(""); }}>
                        <ArrowUpCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Retirar valor" onClick={() => { setCashModal({ id: c.id, type: "withdraw" }); setCashAmount(""); }}>
                        <ArrowDownCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={!!paymentModal} onOpenChange={(o) => !o && setPaymentModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium">{paymentModal?.description}</p>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Valor total: {formatCurrency(paymentModal?.value ?? 0)}</span>
              <span>Já pago: {formatCurrency(paymentModal?.paidValue ?? 0)}</span>
            </div>
            <div className="text-sm font-medium text-primary">
              Restante: {formatCurrency((paymentModal?.value ?? 0) - (paymentModal?.paidValue ?? 0))}
            </div>
            <div>
              <Label>Valor do pagamento (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                max={(paymentModal?.value ?? 0) - (paymentModal?.paidValue ?? 0)}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal(null)}>Cancelar</Button>
            <Button onClick={handlePayment}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Add/Withdraw Modal */}
      <Dialog open={!!cashModal} onOpenChange={(o) => !o && setCashModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {cashModal?.type === "add" ? "Adicionar Valor" : "Retirar Valor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {cashEntries.find(c => c.id === cashModal?.id)?.description}
            </p>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashModal(null)}>Cancelar</Button>
            <Button onClick={handleCashOperation}>
              {cashModal?.type === "add" ? "Adicionar" : "Retirar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receivable Modal */}
      <ReceivableModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} initial={editing} />
    </div>
  );
}

function ReceivableModal({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (d: Omit<Receivable, "id">) => void; initial: Receivable | null }) {
  const [description, setDescription] = useState(initial?.description || "");
  const [value, setValue] = useState(initial?.value?.toString() || "");
  const [paidValue, setPaidValue] = useState(initial?.paidValue?.toString() || "0");
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
      setPaidValue(initial?.paidValue?.toString() || "0");
      setType(initial?.type || "Outro");
      setStatus(initial?.status || "A vencer");
      setDueDate(initial?.dueDate || "");
      setResponsible(initial?.responsible || "");
      setNotes(initial?.notes || "");
    }
  });

  const handleSubmit = () => {
    if (!description || !value) { toast.error("Preencha os campos obrigatórios"); return; }
    onSave({ description, value: parseFloat(value) || 0, paidValue: parseFloat(paidValue) || 0, type, status, dueDate: dueDate || undefined, responsible: responsible || undefined, notes: notes || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} Recebível</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição *</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor Total (R$) *</Label><Input type="number" value={value} onChange={e => setValue(e.target.value)} /></div>
            <div><Label>Valor Pago (R$)</Label><Input type="number" value={paidValue} onChange={e => setPaidValue(e.target.value)} /></div>
          </div>
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
