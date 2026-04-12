import { useState, useRef } from "react";
import { AppConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Upload, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SettingsFormProps {
  config: AppConfig;
  onConfigChange: (config: AppConfig) => void;
  onExport?: () => void;
  onImport?: (file: File) => Promise<boolean>;
  onClear: () => void;
}

export function SettingsForm({ config, onConfigChange, onExport, onImport, onClear }: SettingsFormProps) {
  const [saldo, setSaldo] = useState(config.saldoAnterior.toFixed(2).replace(".", ","));
  const [ano, setAno] = useState(String(config.ano));
  const [socios, setSocios] = useState(String(config.numSocios));
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSaldoBlur = () => {
    const value = parseFloat(saldo.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
    onConfigChange({ ...config, saldoAnterior: value });
    toast.success("Saldo anterior atualizado");
  };

  const handleAnoBlur = () => {
    const value = parseInt(ano) || 2026;
    onConfigChange({ ...config, ano: value });
    toast.success("Ano de referência atualizado");
  };

  const handleSociosBlur = () => {
    const value = parseInt(socios) || 4;
    onConfigChange({ ...config, numSocios: value });
    toast.success("Número de sócios atualizado");
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
      toast.success("Dados exportados com sucesso");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;
    const success = await onImport(file);
    if (success) {
      toast.success("Dados importados com sucesso");
    } else {
      toast.error("Erro ao importar dados. Verifique o arquivo.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="max-w-lg space-y-8 animate-fade-in">
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Módulo de Caixa</h3>
        <div>
          <Label>Saldo restante de {config.ano - 1} (R$)</Label>
          <Input className="mt-1 tabular-nums" value={saldo} onChange={(e) => setSaldo(e.target.value)} onBlur={handleSaldoBlur} />
        </div>
        <div>
          <Label>Ano de referência</Label>
          <Input className="mt-1" type="number" value={ano} onChange={(e) => setAno(e.target.value)} onBlur={handleAnoBlur} />
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Módulo Patrimonial</h3>
        <div>
          <Label>Número de sócios</Label>
          <Input className="mt-1" type="number" value={socios} onChange={(e) => setSocios(e.target.value)} onBlur={handleSociosBlur} />
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Dados</h3>
        <div className="flex flex-col gap-3">
          {onExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Exportar dados (JSON)
            </Button>
          )}
          {onImport && (
            <div>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Importar dados (JSON)
              </Button>
            </div>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Limpar todos os dados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar todos os dados?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação irá excluir todos os lançamentos e dados patrimoniais, restaurando ao padrão. Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onClear}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
