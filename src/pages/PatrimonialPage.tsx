import { usePatrimony } from "@/hooks/usePatrimony";
import { usePatrimonyKPIs } from "@/hooks/usePatrimonyKPIs";
import { useTransactions } from "@/hooks/useTransactions";
import { Header } from "@/components/layout/Header";
import { PatrimonyKPICards } from "@/components/patrimonial/PatrimonyKPICards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceivablesTab } from "@/components/patrimonial/tabs/ReceivablesTab";
import { LoansTab } from "@/components/patrimonial/tabs/LoansTab";
import { AssetsTab } from "@/components/patrimonial/tabs/AssetsTab";
import { PayablesTab } from "@/components/patrimonial/tabs/PayablesTab";

export default function PatrimonialPage() {
  const { config } = useTransactions();
  const patrimony = usePatrimony();
  const kpis = usePatrimonyKPIs(
    { assets: patrimony.assets, receivables: patrimony.receivables, doubtfulCredits: patrimony.doubtfulCredits, cashEntries: patrimony.cashEntries, loans: patrimony.loans, payables: patrimony.payables },
    config.numSocios
  );

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
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="receivables">📥 Recebíveis</TabsTrigger>
            <TabsTrigger value="loans">🏦 Empréstimos</TabsTrigger>
            <TabsTrigger value="assets">🏗 Patrimônio</TabsTrigger>
            <TabsTrigger value="payables">💳 Contas</TabsTrigger>
          </TabsList>
          <TabsContent value="receivables">
            <ReceivablesTab
              receivables={patrimony.receivables}
              doubtfulCredits={patrimony.doubtfulCredits}
              cashEntries={patrimony.cashEntries}
              addReceivable={patrimony.addReceivable}
              updateReceivable={patrimony.updateReceivable}
              deleteReceivable={patrimony.deleteReceivable}
              addDoubtfulCredit={patrimony.addDoubtfulCredit}
              updateDoubtfulCredit={patrimony.updateDoubtfulCredit}
              deleteDoubtfulCredit={patrimony.deleteDoubtfulCredit}
              updateCashEntry={patrimony.updateCashEntry}
            />
          </TabsContent>
          <TabsContent value="loans">
            <LoansTab
              loans={patrimony.loans}
              addLoan={patrimony.addLoan}
              updateLoan={patrimony.updateLoan}
              deleteLoan={patrimony.deleteLoan}
            />
          </TabsContent>
          <TabsContent value="assets">
            <AssetsTab
              assets={patrimony.assets}
              addAsset={patrimony.addAsset}
              updateAsset={patrimony.updateAsset}
              deleteAsset={patrimony.deleteAsset}
            />
          </TabsContent>
          <TabsContent value="payables">
            <PayablesTab
              payables={patrimony.payables}
              addPayable={patrimony.addPayable}
              updatePayable={patrimony.updatePayable}
              deletePayable={patrimony.deletePayable}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
