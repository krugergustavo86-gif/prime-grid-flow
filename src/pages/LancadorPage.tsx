import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { LOCKED_MONTHS } from "@/utils/lockedMonths";
import { getMonthFromDate } from "@/utils/formatters";
import { TransactionModal } from "@/components/lancamentos/TransactionModal";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Receipt, LogOut } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatCurrency, formatDateBR } from "@/utils/formatters";

function mapRow(r: {
  id: string; date: string; description: string; type: string; category: string;
  value: number | string; notes: string | null; month: string; created_at: string; created_by: string | null;
}): Transaction {
  return {
    id: r.id, date: r.date, description: r.description,
    type: r.type as "Saída" | "Entrada", category: r.category,
    value: Number(r.value), notes: r.notes || "", month: r.month,
    created_at: r.created_at, created_by: r.created_by,
  };
}

export default function LancadorPage() {
  const { user, signOut } = useAuth();
  const [myTxns, setMyTxns] = useState<Transaction[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchMine = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("created_by", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load my transactions:", error);
      return;
    }
    setMyTxns((data || []).map(mapRow));
  }, [user?.id]);

  useEffect(() => { void fetchMine(); }, [fetchMine]);

  const handleSave = async (data: Omit<Transaction, "id" | "month">) => {
    const month = getMonthFromDate(data.date);
    const monthNum = month.split("/")[0];
    if (LOCKED_MONTHS.includes(monthNum)) {
      toast.error("Este mês está fechado");
      return;
    }

    if (editTx) {
      const { error } = await supabase
        .from("transactions")
        .update({ ...data, month })
        .eq("id", editTx.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Lançamento atualizado");
    } else {
      const { error } = await supabase
        .from("transactions")
        .insert({ ...data, month, locked: false, created_by: user?.id ?? null });
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Lançamento salvo");
    }
    void fetchMine();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Lançamento excluído");
    setDeleteId(null);
    void fetchMine();
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="h-14 flex items-center gap-3 border-b bg-card px-4 shrink-0">
        <h1 className="text-lg font-semibold text-foreground">Meus Lançamentos</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {user?.email} · Lançador
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4 space-y-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Olá, <span className="font-medium text-foreground">{user?.email}</span>. Use o botão <strong>+</strong> para registrar um novo lançamento. Você só pode visualizar e editar os lançamentos que você mesmo criou.
          </p>
        </div>

        <div className="bg-card rounded-lg border">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">Histórico ({myTxns.length})</h3>
          </div>

          {myTxns.length === 0 ? (
            <div className="p-10 text-center">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum lançamento registrado ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Clique no botão + para começar.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {myTxns.map((tx) => (
                <li key={tx.id} className="p-3 flex items-start justify-between gap-3 hover:bg-muted/20">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground truncate">{tx.description}</p>
                      <span className={tx.type === "Entrada"
                        ? "inline-flex items-center rounded-full bg-chart-entrada px-1.5 py-0.5 text-[10px] font-medium text-success-foreground"
                        : "inline-flex items-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground"}>
                        {tx.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateBR(tx.date)} · {tx.category}
                    </p>
                    {tx.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{tx.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold tabular-nums ${tx.type === "Entrada" ? "text-chart-entrada" : "text-chart-saida"}`}>
                      {tx.type === "Saída" ? "-" : "+"}{formatCurrency(tx.value)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditTx(tx); setModalOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(tx.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Button
        onClick={() => { setEditTx(null); setModalOpen(true); }}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTx(null); }}
        onSave={handleSave}
        editTransaction={editTx}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
