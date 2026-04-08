import { useState } from "react";
import { Loan, LoanType } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface Props {
  loans: Loan[];
  addLoan: (l: Omit<Loan, "id">) => void;
  updateLoan: (id: string, u: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  readOnly?: boolean;
  onPayInstallment?: (loan: Loan, paidValue: number) => void;
}

const LOAN_TYPES: LoanType[] = ["Capital de Giro", "Financiamento", "Fin. Veículo", "Fin. Equipamento", "Consórcio Veículo", "Imóvel", "Terreno", "Pronamp", "Boletos a Pagar", "Outro"];

function isUrgent(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 7;
}

export function LoansTab({ loans, addLoan, updateLoan, deleteLoan, readOnly, onPayInstallment }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [payModalLoan, setPayModalLoan] = useState<Loan | null>(null);
  const [payValue, setPayValue] = useState("");

  const totalBalance = loans.reduce((s, l) => s + (l.totalInstallments - l.paidInstallments) * l.installmentValue, 0);
  const totalOpen = loans.reduce((s, l) => s + (l.totalInstallments - l.paidInstallments), 0);

  const nextUrgent = loans
    .filter(l => l.nextPayment)
    .sort((a, b) => (a.nextPayment || "").localeCompare(b.nextPayment || ""))[0];

  const handleSave = (data: Omit<Loan, "id">) => {
    if (editing) {
      updateLoan(editing.id, data);
      toast.success("Empréstimo atualizado");
    } else {
      addLoan(data);
      toast.success("Empréstimo adicionado");
    }
    setEditing(null);
    setModalOpen(false);
  };

  const isBoleto = (l: Loan) => l.type === "Boletos a Pagar";

  const advanceNextPayment = (dateStr?: string): string | undefined => {
    if (!dateStr) return undefined;
    const d = new Date(dateStr + "T12:00:00");
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  };

  const handlePayClick = (l: Loan) => {
    if (isBoleto(l)) {
      setPayModalLoan(l);
      setPayValue(l.installmentValue?.toString() || "");
    } else {
      const newNextPayment = advanceNextPayment(l.nextPayment);
      updateLoan(l.id, {
        paidInstallments: l.paidInstallments + 1,
        nextPayment: newNextPayment,
      });
      onPayInstallment?.(l, l.installmentValue);
      toast.success(`Parcela ${l.paidInstallments + 1}/${l.totalInstallments} marcada como paga`);
    }
  };

  const handlePayBoleto = () => {
    if (!payModalLoan || !payValue) return;
    const val = parseFloat(payValue) || 0;
    const newNextPayment = advanceNextPayment(payModalLoan.nextPayment);
    updateLoan(payModalLoan.id, {
      paidInstallments: payModalLoan.paidInstallments + 1,
      nextPayment: newNextPayment,
    });
    onPayInstallment?.(payModalLoan, val);
    toast.success(`Boleto de ${formatCurrency(val)} registrado como pago`);
    setPayModalLoan(null);
    setPayValue("");
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Parcelas em Aberto</p>
          <p className="text-xl font-bold tabular-nums text-foreground">{totalOpen}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Saldo Devedor Total</p>
          <p className="text-xl font-bold tabular-nums text-destructive">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Próximo Pagamento</p>
          <p className="text-lg font-bold text-foreground">{nextUrgent?.contract || "—"}</p>
          {nextUrgent?.nextPayment && (
            <p className={`text-xs ${isUrgent(nextUrgent.nextPayment) ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
              {new Date(nextUrgent.nextPayment + "T12:00:00").toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-foreground">Contratos</h3>
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
                <th className="text-left p-3 font-medium text-muted-foreground">Contrato</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Instituição</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Tipo</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Próx. Parcela</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Progresso</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Vlr Parcela</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Saldo Devedor</th>
                {!readOnly && <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => {
                const open = l.totalInstallments - l.paidInstallments;
                const balance = open * l.installmentValue;
                const progress = l.totalInstallments > 0 ? (l.paidInstallments / l.totalInstallments) * 100 : 0;
                const urgent = isUrgent(l.nextPayment);
                return (
                  <tr key={l.id} className={`border-b hover:bg-muted/30 ${urgent ? "bg-destructive/5" : ""}`}>
                    <td className="p-3 font-medium">
                      {l.contract}
                      {urgent && <AlertCircle className="inline h-3.5 w-3.5 text-destructive ml-1" />}
                    </td>
                    <td className="p-3 hidden md:table-cell">{l.institution}</td>
                    <td className="p-3 hidden lg:table-cell"><Badge variant="outline" className="text-xs">{l.type}</Badge></td>
                    <td className={`p-3 hidden md:table-cell ${urgent ? "text-destructive font-semibold" : ""}`}>
                      {l.nextPayment ? new Date(l.nextPayment + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-2 flex-1" />
                        <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">{l.paidInstallments}/{l.totalInstallments}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums">{formatCurrency(l.installmentValue)}</td>
                    <td className="p-3 text-right tabular-nums font-semibold text-destructive">{formatCurrency(balance)}</td>
                    {!readOnly && (
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                                disabled={l.paidInstallments >= l.totalInstallments}
                                onClick={() => handlePayClick(l)}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isBoleto(l) ? "Pagar boleto (valor manual)" : "Pagar parcela"}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(l); setModalOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir empréstimo?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { deleteLoan(l.id); toast.success("Empréstimo excluído"); }}>Excluir</AlertDialogAction></AlertDialogFooter>
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
                <td className="p-3" colSpan={6}>Total Saldo Devedor</td>
                <td className="p-3 text-right tabular-nums text-destructive">{formatCurrency(totalBalance)}</td>
                {!readOnly && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Boleto payment dialog */}
      <Dialog open={!!payModalLoan} onOpenChange={o => { if (!o) { setPayModalLoan(null); setPayValue(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Pagar Boleto</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{payModalLoan?.contract}</p>
          <div>
            <Label>Valor Pago (R$) *</Label>
            <Input type="number" value={payValue} onChange={e => setPayValue(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayModalLoan(null); setPayValue(""); }}>Cancelar</Button>
            <Button onClick={handlePayBoleto} disabled={!payValue}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoanModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} initial={editing} />
    </div>
  );
}

function LoanModal({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (d: Omit<Loan, "id">) => void; initial: Loan | null }) {
  const [contract, setContract] = useState(initial?.contract || "");
  const [institution, setInstitution] = useState(initial?.institution || "");
  const [type, setType] = useState<LoanType>(initial?.type || "Capital de Giro");
  const [nextPayment, setNextPayment] = useState(initial?.nextPayment || "");
  const [totalInstallments, setTotalInstallments] = useState(initial?.totalInstallments?.toString() || "");
  const [paidInstallments, setPaidInstallments] = useState(initial?.paidInstallments?.toString() || "0");
  const [installmentValue, setInstallmentValue] = useState(initial?.installmentValue?.toString() || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  useState(() => {
    if (open) {
      setContract(initial?.contract || "");
      setInstitution(initial?.institution || "");
      setType(initial?.type || "Capital de Giro");
      setNextPayment(initial?.nextPayment || "");
      setTotalInstallments(initial?.totalInstallments?.toString() || "");
      setPaidInstallments(initial?.paidInstallments?.toString() || "0");
      setInstallmentValue(initial?.installmentValue?.toString() || "");
      setNotes(initial?.notes || "");
    }
  });

  const handleSubmit = () => {
    if (!contract || !installmentValue || !totalInstallments) { toast.error("Preencha os campos obrigatórios"); return; }
    onSave({
      contract, institution, type,
      nextPayment: nextPayment || undefined,
      totalInstallments: parseInt(totalInstallments) || 0,
      paidInstallments: parseInt(paidInstallments) || 0,
      installmentValue: parseFloat(installmentValue) || 0,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} Empréstimo</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div><Label>Contrato *</Label><Input value={contract} onChange={e => setContract(e.target.value)} /></div>
          <div><Label>Instituição</Label><Input value={institution} onChange={e => setInstitution(e.target.value)} /></div>
          <div><Label>Tipo</Label>
            <Select value={type} onValueChange={v => setType(v as LoanType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LOAN_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Próximo Pagamento</Label><Input type="date" value={nextPayment} onChange={e => setNextPayment(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Total Parcelas *</Label><Input type="number" value={totalInstallments} onChange={e => setTotalInstallments(e.target.value)} /></div>
            <div><Label>Parcelas Pagas</Label><Input type="number" value={paidInstallments} onChange={e => setPaidInstallments(e.target.value)} /></div>
          </div>
          <div><Label>Valor da Parcela (R$) *</Label><Input type="number" value={installmentValue} onChange={e => setInstallmentValue(e.target.value)} /></div>
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
