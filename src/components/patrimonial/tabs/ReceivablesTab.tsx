import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, CheckCircle, AlertTriangle, ArrowUpCircle, ArrowDownCircle, DollarSign, Undo2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  receivables: Receivable[];
  doubtfulCredits: DoubtfulCredit[];
  cashEntries: CashEntry[];
  caixaAtual?: number;
  addReceivable: (r: Omit<Receivable, "id">) => void | Promise<boolean | void>;
  updateReceivable: (id: string, u: Partial<Receivable>) => void | Promise<boolean | void>;
  deleteReceivable: (id: string) => void | Promise<boolean | void>;
  addDoubtfulCredit: (d: Omit<DoubtfulCredit, "id">) => void;
  updateDoubtfulCredit: (id: string, u: Partial<DoubtfulCredit>) => void;
  deleteDoubtfulCredit: (id: string) => void;
  updateCashEntry: (id: string, u: Partial<CashEntry>) => void;
  onReceivablePayment?: (receivable: Receivable, amount: number) => void;
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
  const { receivables, doubtfulCredits, cashEntries, caixaAtual, readOnly, onReceivablePayment } = props;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Receivable | null>(null);
  const [doubtfulModalOpen, setDoubtfulModalOpen] = useState(false);
  const [editingDoubtful, setEditingDoubtful] = useState<DoubtfulCredit | null>(null);
  const [cashModal, setCashModal] = useState<{ id: string; type: "add" | "withdraw" } | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [paymentModal, setPaymentModal] = useState<{ receivable: Receivable; mode: "pay" | "add" } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const totalRemaining = receivables.reduce((s, r) => s + Math.max(0, r.value - r.paidValue), 0);
  const totalDoubtful = doubtfulCredits.reduce((s, d) => s + d.value, 0);
  // Build effective cash entries: override "Saldo em Conta" with caixaAtual when available
  const effectiveCashEntries = cashEntries.map(c => {
    if (caixaAtual !== undefined && c.description.toLowerCase().includes("saldo em conta")) {
      return { ...c, balance: caixaAtual };
    }
    return c;
  });
  const totalCash = effectiveCashEntries.reduce((s, c) => s + c.balance, 0);

  const handleSave = async (data: Omit<Receivable, "id">) => {
    if (editing) {
      const ok = await props.updateReceivable(editing.id, data);
      if (ok !== false) toast.success("Recebível atualizado");
    } else {
      const ok = await props.addReceivable(data);
      if (ok !== false) toast.success("Recebível adicionado");
    }
    setEditing(null);
    setModalOpen(false);
  };

  const handlePaymentOrAdd = () => {
    if (!paymentModal || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Informe um valor válido"); return; }
    const r = paymentModal.receivable;
    const remaining = r.value - r.paidValue;
    if (paymentModal.mode === "pay") {
      if (amount > remaining) { toast.error("Valor excede o saldo devedor"); return; }
      const newPaid = r.paidValue + amount;
      const updates: Partial<Receivable> = { paidValue: newPaid };
      if (newPaid >= r.value) updates.status = "Recebido";
      props.updateReceivable(r.id, updates);
      // BUG 1 fix: register cash entry so patrimony reflects the receipt
      onReceivablePayment?.(r, amount);
      toast.success(`Pagamento de ${formatCurrency(amount)} registrado`);
    } else {
      props.updateReceivable(r.id, { value: r.value + amount });
      toast.success(`${formatCurrency(amount)} adicionado ao saldo devedor`);
    }
    setPaymentModal(null);
    setPaymentAmount("");
  };

  const handleSaveDoubtful = (data: Omit<DoubtfulCredit, "id">) => {
    if (editingDoubtful) {
      props.updateDoubtfulCredit(editingDoubtful.id, data);
      toast.success("Cobrança duvidosa atualizada");
    } else {
      props.addDoubtfulCredit(data);
      toast.success("Cobrança duvidosa adicionada");
    }
    setEditingDoubtful(null);
    setDoubtfulModalOpen(false);
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
              <span className="text-primary font-medium">Saldo Devedor Total: {formatCurrency(totalRemaining)}</span>
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
                <th className="text-right p-3 font-medium text-muted-foreground">Saldo Devedor</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                {!readOnly && <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {receivables.map((r) => {
                const remaining = Math.max(0, r.value - r.paidValue);
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">{r.description}</td>
                    <td className="p-3 text-right tabular-nums font-medium text-primary">{formatCurrency(remaining)}</td>
                    <td className="p-3 hidden md:table-cell">{r.type}</td>
                    <td className="p-3">{statusBadge(r.status)}</td>
                    {!readOnly && (
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {r.status !== "Recebido" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-success" title="Registrar pagamento" onClick={() => { setPaymentModal({ receivable: r, mode: "pay" }); setPaymentAmount(""); }}>
                            <DollarSign className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-chart-blue-medium" title="Adicionar valor à dívida" onClick={() => { setPaymentModal({ receivable: r, mode: "add" }); setPaymentAmount(""); }}>
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setModalOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {r.status !== "Recebido" ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-success" title="Marcar como recebido (total)" onClick={() => {
                            const remainingNow = Math.max(0, r.value - r.paidValue);
                            props.updateReceivable(r.id, { status: "Recebido", paidValue: r.value });
                            if (remainingNow > 0) onReceivablePayment?.(r, remainingNow);
                            toast.success("Marcado como recebido");
                          }}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Desfazer recebimento" onClick={() => { props.updateReceivable(r.id, { status: "A vencer" }); toast.success("Status revertido para A vencer"); }}>
                            <Undo2 className="h-3.5 w-3.5" />
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
                <td className="p-3 text-right tabular-nums text-primary">{formatCurrency(totalRemaining)}</td>
                <td colSpan={readOnly ? 2 : 3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Doubtful Credits */}
      <div className="bg-warning/30 rounded-lg border border-warning-foreground/20">
        <div className="flex items-center justify-between p-4 border-b border-warning-foreground/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-foreground" />
            <h3 className="font-semibold text-warning-foreground">Crédito de Liquidação Duvidosa</h3>
          </div>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => { setEditingDoubtful(null); setDoubtfulModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          )}
        </div>
        <div className="p-4 space-y-2">
          {doubtfulCredits.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 py-2 border-b border-warning-foreground/10 last:border-0">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-foreground">{d.description}</span>
                {d.responsible && <span className="text-xs text-muted-foreground ml-2">({d.responsible})</span>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-semibold tabular-nums text-warning-foreground">{formatCurrency(d.value)}</span>
                {!readOnly && (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingDoubtful(d); setDoubtfulModalOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Excluir cobrança duvidosa?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { props.deleteDoubtfulCredit(d.id); toast.success("Cobrança excluída"); }}>Excluir</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 font-bold">
            <span className="text-warning-foreground">Total Duvidoso</span>
            <span className="tabular-nums text-warning-foreground">{formatCurrency(totalDoubtful)}</span>
          </div>
        </div>
      </div>

      <DoubtfulCreditModal open={doubtfulModalOpen} onClose={() => { setDoubtfulModalOpen(false); setEditingDoubtful(null); }} onSave={handleSaveDoubtful} initial={editingDoubtful} />

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
              {effectiveCashEntries.map((c) => (
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

      {/* Payment / Add Value Modal */}
      <Dialog open={!!paymentModal} onOpenChange={(o) => !o && setPaymentModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{paymentModal?.mode === "add" ? "Adicionar Valor" : "Registrar Pagamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium">{paymentModal?.receivable.description}</p>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Valor total: {formatCurrency(paymentModal?.receivable.value ?? 0)}</span>
              <span>Já pago: {formatCurrency(paymentModal?.receivable.paidValue ?? 0)}</span>
            </div>
            {paymentModal?.mode === "pay" && (
              <div className="text-sm font-medium text-primary">
                Restante: {formatCurrency((paymentModal?.receivable.value ?? 0) - (paymentModal?.receivable.paidValue ?? 0))}
              </div>
            )}
            <div>
              <Label>{paymentModal?.mode === "add" ? "Valor a adicionar (R$)" : "Valor do pagamento (R$)"}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal(null)}>Cancelar</Button>
            <Button onClick={handlePaymentOrAdd}>
              {paymentModal?.mode === "add" ? "Adicionar" : "Registrar"}
            </Button>
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

  useEffect(() => {
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
  }, [open, initial]);

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

function DoubtfulCreditModal({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (d: Omit<DoubtfulCredit, "id">) => void; initial: DoubtfulCredit | null }) {
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [responsible, setResponsible] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setDescription(initial?.description || "");
      setValue(initial?.value?.toString() || "");
      setResponsible(initial?.responsible || "");
      setNotes(initial?.notes || "");
    }
  }, [open, initial]);

  const handleSubmit = () => {
    if (!description || !value) { toast.error("Preencha os campos obrigatórios"); return; }
    onSave({ description, value: parseFloat(value) || 0, responsible: responsible || undefined, notes: notes || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Editar" : "Nova"} Cobrança Duvidosa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição *</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div><Label>Valor (R$) *</Label><Input type="number" value={value} onChange={e => setValue(e.target.value)} /></div>
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
