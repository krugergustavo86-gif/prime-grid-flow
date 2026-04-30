import { useCallback } from "react";
import { usePatrimony } from "@/hooks/usePatrimony";
import { usePatrimonyKPIs } from "@/hooks/usePatrimonyKPIs";
import { useTransactions } from "@/hooks/useTransactions";
import { useAnnualSummary } from "@/hooks/useAnnualSummary";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { PatrimonyKPICards } from "@/components/patrimonial/PatrimonyKPICards";
import { Loan } from "@/types";
import { getMonthFromDate } from "@/utils/formatters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceivablesTab } from "@/components/patrimonial/tabs/ReceivablesTab";
import { LoansTab } from "@/components/patrimonial/tabs/LoansTab";
import { AssetsTab } from "@/components/patrimonial/tabs/AssetsTab";
import { PayablesTab } from "@/components/patrimonial/tabs/PayablesTab";
import { EvolutionTab } from "@/components/patrimonial/tabs/EvolutionTab";

export default function PatrimonialPage() {
  const { transactions, config, addTransaction } = useTransactions();
  const { caixaAtual } = useAnnualSummary(transactions, config.saldoAnterior, config.ano);
  const { isAdmin } = useAuth();
  const readOnly = !isAdmin;

  const handlePayInstallment = useCallback(async (loan: Loan, paidValue: number) => {
    const today = new Date().toISOString().split("T")[0];
    await addTransaction({
      date: today,
      description: `Parcela ${loan.paidInstallments + 1}/${loan.totalInstallments} - ${loan.contract}`,
      type: "Saída",
      category: "Empréstimos/Financiamentos",
      value: paidValue,
      notes: `Lançamento automático - ${loan.institution || loan.type}`,
    });
  }, [addTransaction]);
  const patrimony = usePatrimony();
  const kpis = usePatrimonyKPIs(patrimony, config.numSocios, caixaAtual);

  return (
    <div className="flex flex-col h-full">
      <Header title="Painel Patrimonial" />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 space-y-6">
        <PatrimonyKPICards
          grossPatrimony={kpis.grossPatrimony}
          netPatrimony={kpis.netPatrimony}
          perPartner={kpis.perPartner}
          totalAPagar={kpis.totalAPagar}
          cashAvailable={kpis.cashAvailable}
          debtRate={kpis.debtRate}
        />

        <Tabs defaultValue="receivables">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="receivables">📥 Recebíveis</TabsTrigger>
            <TabsTrigger value="loans">🏦 Empréstimos</TabsTrigger>
            <TabsTrigger value="assets">🏗 Patrimônio</TabsTrigger>
            <TabsTrigger value="payables">💳 Contas</TabsTrigger>
            <TabsTrigger value="evolution">📈 Evolução</TabsTrigger>
          </TabsList>
          <TabsContent value="receivables">
            <ReceivablesTab
              receivables={patrimony.receivables}
              doubtfulCredits={patrimony.doubtfulCredits}
              cashEntries={patrimony.cashEntries}
              caixaAtual={caixaAtual}
              addReceivable={patrimony.addReceivable}
              updateReceivable={patrimony.updateReceivable}
              deleteReceivable={patrimony.deleteReceivable}
              addDoubtfulCredit={patrimony.addDoubtfulCredit}
              updateDoubtfulCredit={patrimony.updateDoubtfulCredit}
              deleteDoubtfulCredit={patrimony.deleteDoubtfulCredit}
              deleteCashEntry={patrimony.deleteCashEntry}
              updateCashEntry={patrimony.updateCashEntry}
              onReceivablePayment={async (r, amount) => {
                const today = new Date().toISOString().split("T")[0];
                await addTransaction({
                  date: today,
                  description: `Recebimento - ${r.description}`,
                  type: "Entrada",
                  category: "Recebimentos",
                  value: amount,
                  notes: `Baixa automática de recebível`,
                });
              }}
              readOnly={readOnly}
            />
          </TabsContent>
          <TabsContent value="loans">
            <LoansTab
              loans={patrimony.loans}
              addLoan={patrimony.addLoan}
              updateLoan={patrimony.updateLoan}
              deleteLoan={patrimony.deleteLoan}
              readOnly={readOnly}
              onPayInstallment={handlePayInstallment}
            />
          </TabsContent>
          <TabsContent value="assets">
            <AssetsTab
              assets={patrimony.assets}
              addAsset={patrimony.addAsset}
              updateAsset={patrimony.updateAsset}
              deleteAsset={patrimony.deleteAsset}
              readOnly={readOnly}
            />
          </TabsContent>
          <TabsContent value="payables">
            <PayablesTab
              payables={patrimony.payables}
              addPayable={patrimony.addPayable}
              updatePayable={patrimony.updatePayable}
              deletePayable={patrimony.deletePayable}
              readOnly={readOnly}
            />
          </TabsContent>
          <TabsContent value="evolution">
            <EvolutionTab
              readOnly={readOnly}
              numSocios={config.numSocios}
              autoGrossPatrimony={kpis.grossPatrimony}
              autoTotalDebt={kpis.totalAPagar}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
