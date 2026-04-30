import { useState, useCallback, useEffect } from "react";
import { Transaction } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { LOCKED_MONTHS } from "@/utils/lockedMonths";
import { getMonthFromDate } from "@/utils/formatters";
import { useAppConfig } from "@/hooks/useAppConfig";
import { toast } from "sonner";

const TRANSACTIONS_PAGE_SIZE = 1000;
const MAX_PAGES = 100;

export function useTransactions() {
  const { config, setConfig, loading: configLoading } = useAppConfig();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchAllTransactions = async () => {
      const rows: Transaction[] = [];
      for (let page = 0; page < MAX_PAGES; page++) {
        if (cancelled) return [];
        const from = page * TRANSACTIONS_PAGE_SIZE;
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .order("date", { ascending: true })
          .range(from, from + TRANSACTIONS_PAGE_SIZE - 1);

        if (error) throw error;
        if (!data?.length) break;

        rows.push(...data.map((r) => ({
          id: r.id,
          date: r.date,
          description: r.description,
          type: r.type as "Saída" | "Entrada",
          category: r.category,
          value: Number(r.value),
          notes: r.notes || "",
          month: r.month,
          created_at: r.created_at,
          created_by: r.created_by ?? null,
        })));

        if (data.length < TRANSACTIONS_PAGE_SIZE) break;
      }
      return rows;
    };

    (async () => {
      try {
        const rows = await fetchAllTransactions();
        if (!cancelled) setTransactions(rows);
      } catch (err) {
        if (!cancelled) console.error("Failed to load transactions:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const addTransaction = useCallback(async (tx: Omit<Transaction, "id" | "month">) => {
    const month = getMonthFromDate(tx.date);
    const monthNum = month.split("/")[0];
    if (LOCKED_MONTHS.includes(monthNum)) return false;

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        date: tx.date,
        description: tx.description,
        type: tx.type,
        category: tx.category,
        value: tx.value,
        notes: tx.notes || "",
        month,
        locked: false,
        created_by: user?.id ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add transaction:", error);
      toast.error("Erro ao salvar lançamento");
      return false;
    }

    if (data) {
      setTransactions(prev => [...prev, {
        id: data.id,
        date: data.date,
        description: data.description,
        type: data.type as "Saída" | "Entrada",
        category: data.category,
        value: Number(data.value),
        notes: data.notes || "",
        month: data.month,
        created_at: data.created_at,
        created_by: data.created_by ?? null,
      }]);
    }
    return true;
  }, []);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Omit<Transaction, "id" | "month">>) => {
    const dbUpdates: Record<string, unknown> = { ...updates };
    if (updates.date) dbUpdates.month = getMonthFromDate(updates.date);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("transactions").update(dbUpdates as any).eq("id", id);
    if (error) {
      console.error("Failed to update transaction:", error);
      toast.error("Erro ao atualizar lançamento");
      return false;
    }

    setTransactions(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...updates };
      if (updates.date) updated.month = getMonthFromDate(updates.date);
      return updated;
    }));
    return true;
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete transaction:", error);
      toast.error("Erro ao excluir lançamento");
      return;
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const getTransactionsByMonth = useCallback((monthNum: string) => {
    return transactions.filter(t => t.month.startsWith(monthNum + "/"));
  }, [transactions]);

  const isMonthLocked = useCallback((monthNum: string) => {
    return LOCKED_MONTHS.includes(monthNum);
  }, []);

  return {
    transactions, config, setConfig, loading: loading || configLoading,
    addTransaction, updateTransaction, deleteTransaction,
    getTransactionsByMonth, isMonthLocked,
  };
}
