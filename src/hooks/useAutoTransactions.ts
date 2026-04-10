import { useState, useEffect, useCallback } from "react";
import { AutoTransaction } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAutoTransactions() {
  const [autoTxns, setAutoTxns] = useState<AutoTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("auto_transactions")
        .select("*, loans(contract)")
        .order("generated_date", { ascending: false });

      if (error) {
        console.error("Failed to load auto transactions:", error);
        setLoading(false);
        return;
      }

      setAutoTxns(
        (data || []).map((r: any) => ({
          id: r.id,
          loanId: r.loan_id,
          transactionId: r.transaction_id,
          generatedDate: r.generated_date,
          month: r.month,
          value: Number(r.value),
          description: r.description,
          reversed: r.reversed,
          createdAt: r.created_at,
          loanContract: r.loans?.contract,
        }))
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const reverseAutoTransaction = useCallback(async (id: string, transactionId?: string) => {
    // Mark as reversed
    const { error } = await supabase
      .from("auto_transactions")
      .update({ reversed: true })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao reverter");
      return;
    }

    // Delete the linked transaction if it exists
    if (transactionId) {
      await supabase.from("transactions").delete().eq("id", transactionId);
    }

    setAutoTxns(prev =>
      prev.map(t => (t.id === id ? { ...t, reversed: true } : t))
    );
    toast.success("Lançamento automático revertido");
  }, []);

  return { autoTxns, loading, reverseAutoTransaction };
}
