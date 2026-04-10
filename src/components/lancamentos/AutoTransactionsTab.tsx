import { AutoTransaction } from "@/types";
import { formatCurrency, formatDateBR } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Undo2 } from "lucide-react";

interface Props {
  autoTxns: AutoTransaction[];
  loading: boolean;
  onReverse: (id: string, transactionId?: string) => void;
  readOnly?: boolean;
}

export function AutoTransactionsTab({ autoTxns, loading, onReverse, readOnly }: Props) {
  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Carregando...</p>;
  }

  if (!autoTxns.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">Nenhum lançamento automático</p>
        <p className="text-sm mt-1">Configure "Débito em conta" nos empréstimos para gerar lançamentos automaticamente.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-foreground">Lançamentos Automáticos Gerados</h3>
        <p className="text-xs text-muted-foreground mt-1">Histórico de todos os débitos em conta processados automaticamente</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Contrato</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Mês Ref.</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
              {!readOnly && <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {autoTxns.map((at) => (
              <tr key={at.id} className={`border-b hover:bg-muted/30 ${at.reversed ? "opacity-50" : ""}`}>
                <td className="p-3 tabular-nums">{formatDateBR(at.generatedDate)}</td>
                <td className="p-3 font-medium">{at.loanContract || "—"}</td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">{at.description}</td>
                <td className="p-3">{at.month}</td>
                <td className="p-3 text-right tabular-nums font-semibold text-destructive">{formatCurrency(at.value)}</td>
                <td className="p-3 text-center">
                  {at.reversed ? (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Revertido</Badge>
                  ) : (
                    <Badge variant="default" className="text-xs bg-chart-entrada">Ativo</Badge>
                  )}
                </td>
                {!readOnly && (
                  <td className="p-3 text-right">
                    {!at.reversed && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Undo2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reverter lançamento automático?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O lançamento de saída será excluído e este débito será marcado como revertido.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onReverse(at.id, at.transactionId)}>Reverter</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
