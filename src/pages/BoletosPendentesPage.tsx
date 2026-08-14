import { Header } from "@/components/layout/Header";
import { PendingBoletosTab } from "@/components/lancamentos/PendingBoletosTab";
import { useAuth } from "@/hooks/useAuth";

export default function BoletosPendentesPage() {
  const { canManageLancamentos, isGerencia } = useAuth();
  const readOnly = isGerencia || !canManageLancamentos;

  return (
    <div className="flex flex-col h-full">
      <Header title="Boletos Pendentes" />
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
        <PendingBoletosTab readOnly={readOnly} />
      </div>
    </div>
  );
}
