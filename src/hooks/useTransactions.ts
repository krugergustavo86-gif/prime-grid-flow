import { useState, useCallback, useEffect } from "react";
import { Transaction, AppConfig } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { LOCKED_MONTHS } from "@/utils/seed";
import { getMonthFromDate } from "@/utils/formatters";
import { toast } from "sonner";

const DEFAULT_CONFIG: AppConfig = { saldoAnterior: 409000, ano: 2026, numSocios: 4 };
const TRANSACTIONS_PAGE_SIZE = 1000;

export function useTransactions() {
  const [config, setConfigState] = useState<AppConfig>(DEFAULT_CONFIG);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllTransactions = async () => {
      const rows: any[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .order("date", { ascending: true })
          .range(from, from + TRANSACTIONS_PAGE_SIZE - 1);

        if (error) throw error;
        if (!data?.length) break;

        rows.push(...data);

        if (data.length < TRANSACTIONS_PAGE_SIZE) break;
        from += TRANSACTIONS_PAGE_SIZE;
      }

      return rows;
    };

    const fetchData = async () => {
      try {
        const [transactionRows, cfgRes] = await Promise.all([
          fetchAllTransactions(),
          supabase.from("app_config").select("*").limit(1).maybeSingle(),
        ]);

        setTransactions(transactionRows.map((r: any) => ({
          id: r.id,
          date: r.date,
          description: r.description,
          type: r.type as "Saída" | "Entrada",
          category: r.category,
          value: Number(r.value),
          notes: r.notes || "",
          month: r.month,
          created_at: r.created_at,
        })));

        if (cfgRes.data) {
          setConfigState({
            saldoAnterior: Number(cfgRes.data.saldo_anterior),
            ano: cfgRes.data.ano,
            numSocios: cfgRes.data.num_socios,
          });
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const setConfig = useCallback(async (newConfig: AppConfig) => {
    setConfigState(newConfig);

    const { data: current, error: fetchError } = await supabase
      .from("app_config")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (fetchError || !current?.id) {
      console.error("Failed to load app_config row:", fetchError);
      toast.error("Erro ao salvar configuração");
      return;
    }

    const { error } = await supabase
      .from("app_config")
      .update({
        saldo_anterior: newConfig.saldoAnterior,
        ano: newConfig.ano,
        num_socios: newConfig.numSocios,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);
    if (error) {
      console.error("Failed to update config:", error);
      toast.error("Erro ao salvar configuração");
    }
  }, []);

  const addTransaction = useCallback(async (tx: Omit<Transaction, "id" | "month">) => {
    const month = getMonthFromDate(tx.date);
    const monthNum = month.split("/")[0];
    if (LOCKED_MONTHS.includes(monthNum)) return false;

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
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add transaction:", error);
      toast.error("Erro ao salvar lançamento");
      return false;
    }

    if (data) {
      const newTx: Transaction = {
        id: data.id,
        date: data.date,
        description: data.description,
        type: data.type as "Saída" | "Entrada",
        category: data.category,
        value: Number(data.value),
        notes: data.notes || "",
        month: data.month,
        created_at: data.created_at,
      };
      setTransactions(prev => [...prev, newTx]);
    }
    return true;
  }, []);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Omit<Transaction, "id" | "month">>) => {
    const dbUpdates: any = { ...updates };
    if (updates.date) {
      dbUpdates.month = getMonthFromDate(updates.date);
    }

    const { error } = await supabase.from("transactions").update(dbUpdates).eq("id", id);
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

  const clearAllData = useCallback(async () => {
    // This is a destructive operation - delete all unlocked transactions
    toast.error("Função desabilitada no modo banco de dados");
  }, []);

  const exportData = useCallback(() => {
    const data = { config, transactions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `primegrid_financeiro_${config.ano}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config, transactions]);

  const importData = useCallback(async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.transactions && data.config) {
            // Insert new transactions
            const txns = data.transactions.map((tx: any) => ({
              date: tx.date,
              description: tx.description,
              type: tx.type,
              category: tx.category,
              value: tx.value,
              notes: tx.notes || "",
              month: tx.month,
              locked: tx.locked || false,
            }));

            // Delete existing and re-insert
            await supabase.from("transactions").delete().not("id", "is", null);
            
            // Insert in batches of 50
            for (let i = 0; i < txns.length; i += 50) {
              const batch = txns.slice(i, i + 50);
              await supabase.from("transactions").insert(batch);
            }

            // Update config
            if (data.config) {
              await supabase.from("app_config").update({
                saldo_anterior: data.config.saldoAnterior ?? data.config.saldo_anterior ?? 409000,
                ano: data.config.ano ?? 2026,
                num_socios: data.config.numSocios ?? data.config.num_socios ?? 4,
              }).not("id", "is", null);
            }

            // Reload
            window.location.reload();
            resolve(true);
          } else {
            resolve(false);
          }
        } catch { resolve(false); }
      };
      reader.readAsText(file);
    });
  }, []);

  return {
    transactions, config, setConfig, loading,
    addTransaction, updateTransaction, deleteTransaction,
    getTransactionsByMonth, isMonthLocked,
    clearAllData, exportData, importData,
  };
}
