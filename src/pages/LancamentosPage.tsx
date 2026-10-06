import { useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useMonthSummary } from "@/hooks/useMonthSummary";
import { useAutoTransactions } from "@/hooks/useAutoTransactions";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { MonthSelector } from "@/components/lancamentos/MonthSelector";
import { MonthSummaryCards } from "@/components/lancamentos/MonthSummaryCards";
import { DonutCharts } from "@/components/lancamentos/DonutCharts";
import { TransactionTable } from "@/components/lancamentos/TransactionTable";
import { TransactionModal } from "@/components/lancamentos/TransactionModal";
import { AutoTransactionsTab } from "@/components/lancamentos/AutoTransactionsTab";
import { ImportExtratoDialog } from "@/components/lancamentos/ImportExtratoDialog";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Transaction } from "@/types";

export default function LancamentosPage() {
  const currentMonthNum = String(new Date().getMonth() + 1).padStart(2, "0");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { canManageLancamentos, isGerencia } = useAuth();

  const { addTransaction, updateTransaction, deleteTransaction, getTransactionsByMonth, config } = useTransactions();
  const monthTxns = getTransactionsByMonth(selectedMonth);
  const { entradas, saidas, balanco, isLocked } = useMonthSummary(monthTxns, selectedMonth, config.ano);
  const { autoTxns, loading: autoLoading, reverseAutoTransaction } = useAutoTransactions();

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
        <Tabs defaultValue="lancamentos">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <TabsList>
              <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
              <TabsTrigger value="automaticos">Automáticos</TabsTrigger>
            </TabsList>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-1" /> Importar extrato
              </Button>
            )}
          </div>


          <TabsContent value="lancamentos" className="space-y-4 mt-4">
            <MonthSelector selectedMonth={selectedMonth} onSelect={setSelectedMonth} year={config.ano} />
            <MonthSummaryCards entradas={entradas} saidas={saidas} balanco={balanco} />
            <DonutCharts transactions={monthTxns} />
            <TransactionTable transactions={monthTxns} locked={isLocked || readOnly} onEdit={handleEdit} onDelete={handleDelete} />
          </TabsContent>

          <TabsContent value="automaticos" className="mt-4">
            <AutoTransactionsTab
              autoTxns={autoTxns}
              loading={autoLoading}
              onReverse={reverseAutoTransaction}
              readOnly={readOnly}
            />
          </TabsContent>

        </Tabs>

      </div>

      {!readOnly && (
        <Button onClick={handleNew} aria-label="Novo lançamento" className="fixed bottom-20 md:bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40" size="icon">
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <ImportExtratoDialog open={importOpen} onClose={() => setImportOpen(false)} onDone={() => window.location.reload()} />
      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} editTransaction={editTx} />
    </div>
  );
}
