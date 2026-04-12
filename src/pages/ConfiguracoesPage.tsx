import { useAppConfig } from "@/hooks/useAppConfig";
import { Header } from "@/components/layout/Header";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { toast } from "sonner";

export default function ConfiguracoesPage() {
  const { config, setConfig, loading } = useAppConfig();

  const handleClear = () => {
    toast.error("Função desabilitada no modo banco de dados");
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Configurações" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Configurações" />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
        <SettingsForm
          config={config}
          onConfigChange={setConfig}
          onClear={handleClear}
        />
      </div>
    </div>
  );
}
