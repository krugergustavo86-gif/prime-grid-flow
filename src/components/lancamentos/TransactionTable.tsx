import { useState } from "react";
import { Transaction } from "@/types";
import { formatCurrency, formatDateBR } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TransactionTableProps {
  transactions: Transaction[];
  locked: boolean;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionTable({ transactions, locked, onEdit, onDelete }: TransactionTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "Entrada" | "Saída">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const filtered = transactions
    .filter(t => filter === "all" || t.type === filter)
    .filter(t => t.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  const pageSize = 50;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  if (transactions.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center animate-fade-in">
        <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground text-sm">Nenhum lançamento neste mês.</p>
        <p className="text-muted-foreground text-xs mt-1">Clique em + para adicionar.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border animate-fade-in">
      <div className="p-3 border-b flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "Entrada", "Saída"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => { setFilter(f); setPage(0); }}
              className="text-xs"
            >
              {f === "all" ? "Todos" : f === "Entrada" ? "Entradas" : "Saídas"}
            </Button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Categoria</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Obs.</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((tx, i) => (
              <tr key={tx.id} className={`border-b hover:bg-muted/20 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                <td className="p-3 tabular-nums text-foreground">{formatDateBR(tx.date)}</td>
                <td className="p-3 text-foreground">{tx.description}</td>
                  <td className="p-3">
                    <span className={tx.type === "Entrada" ? "inline-flex items-center rounded-full bg-chart-entrada px-2 py-0.5 text-xs font-medium text-success-foreground" : "inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground"}>
                      {tx.type}
                    </span>
                  </td>
                <td className="p-3 text-muted-foreground">{tx.category}</td>
                <td className="p-3 text-right tabular-nums font-medium text-foreground">{formatCurrency(tx.value)}</td>
                <td className="p-3 text-muted-foreground text-xs max-w-[150px] truncate">{tx.notes || "—"}</td>
                <td className="p-3">
                  {!locked && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(tx)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeleteId(tx.id)} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y">
        {paged.map((tx) => (
          <div key={tx.id} className="p-3">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="font-medium text-sm text-foreground">{tx.description}</p>
                <p className="text-xs text-muted-foreground">{formatDateBR(tx.date)} · {tx.category}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-sm font-bold tabular-nums ${tx.type === "Entrada" ? "text-chart-entrada" : "text-chart-saida"}`}>
                  {tx.type === "Saída" ? "-" : "+"}{formatCurrency(tx.value)}
                </span>
                {!locked && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit(tx)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setDeleteId(tx.id)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            {tx.notes && <p className="text-xs text-muted-foreground mt-1">{tx.notes}</p>}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-t flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground flex items-center">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Receipt(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  );
}
