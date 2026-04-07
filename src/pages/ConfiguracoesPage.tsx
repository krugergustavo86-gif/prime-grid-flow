import { useTransactions } from "@/hooks/useTransactions";
import { Header } from "@/components/layout/Header";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { toast } from "sonner";

export default function ConfiguracoesPage() {
  const { config, setConfig, exportData, importData, clearAllData } = useTransactions();

  const handleClear = () => {
    clearAllData();
    toast.success("Dados limpos e restaurados ao padrão");
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Configurações" />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
        <SettingsForm
          config={config}
          onConfigChange={setConfig}
          onExport={exportData}
          onImport={importData}
          onClear={handleClear}
        />
      </div>
    </div>
  );
}
