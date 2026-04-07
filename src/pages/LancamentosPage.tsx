import { useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useMonthSummary } from "@/hooks/useMonthSummary";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { MonthSelector } from "@/components/lancamentos/MonthSelector";
import { MonthSummaryCards } from "@/components/lancamentos/MonthSummaryCards";
import { DonutCharts } from "@/components/lancamentos/DonutCharts";
import { TransactionTable } from "@/components/lancamentos/TransactionTable";
import { TransactionModal } from "@/components/lancamentos/TransactionModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Transaction } from "@/types";

export default function LancamentosPage() {
  const currentMonthNum = String(new Date().getMonth() + 1).padStart(2, "0");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const { canManageLancamentos, isGerencia } = useAuth();

  const { transactions, config, addTransaction, updateTransaction, deleteTransaction, isMonthLocked, getTransactionsByMonth } = useTransactions();
  const monthTxns = getTransactionsByMonth(selectedMonth);
  const { entradas, saidas, balanco, isLocked } = useMonthSummary(transactions, selectedMonth);

  const readOnly = isGerencia || (!canManageLancamentos);

  const handleNew = () => {
    if (readOnly) { toast.error("Você não tem permissão para editar lançamentos"); return; }
    if (isLocked) { toast.error("Este mês está fechado e não pode ser editado"); return; }
    setEditTx(null);
    setModalOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    if (readOnly) { toast.error("Você não tem permissão para editar lançamentos"); return; }
    if (isLocked) { toast.error("Este mês está fechado e não pode ser editado"); return; }
    setEditTx(tx);
    setModalOpen(true);
  };

  const handleSave = (data: Omit<Transaction, "id" | "month">) => {
    if (editTx) {
      updateTransaction(editTx.id, data);
      toast.success("Lançamento atualizado com sucesso");
    } else {
      const success = addTransaction(data);
      if (success) toast.success("Lançamento salvo com sucesso");
      else toast.error("Este mês está fechado e não pode ser editado");
    }
  };

  const handleDelete = (id: string) => {
    if (readOnly) { toast.error("Você não tem permissão para excluir lançamentos"); return; }
    deleteTransaction(id);
    toast.success("Lançamento excluído");
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Lançamentos" />
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4 space-y-4">
        <MonthSelector selectedMonth={selectedMonth} onSelect={setSelectedMonth} />
        <MonthSummaryCards entradas={entradas} saidas={saidas} balanco={balanco} />
        <DonutCharts transactions={monthTxns} />
        <TransactionTable transactions={monthTxns} locked={isLocked || readOnly} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {!readOnly && (
        <Button onClick={handleNew} className="fixed bottom-20 md:bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40" size="icon">
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} editTransaction={editTx} />
    </div>
  );
}
