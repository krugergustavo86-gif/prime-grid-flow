import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMonthFromDate } from "@/utils/formatters";
import { toast } from "sonner";

export interface PendingBoleto {
  id: string;
  osNumber: string | null;
  clientName: string | null;
  area: string | null;
  value: number;
  dueDate: string | null;
  entryDate: string;
  paymentMethod: string | null;
  description: string;
  category: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

type Row = {
  id: string;
  os_number: string | null;
  client_name: string | null;
  area: string | null;
  value: number | string;
  due_date: string | null;
  entry_date: string;
  payment_method: string | null;
  description: string;
  category: string;
  notes: string | null;
  status: string;
  created_at: string;
};

const mapRow = (r: Row): PendingBoleto => ({
  id: r.id,
  osNumber: r.os_number,
  clientName: r.client_name,
  area: r.area,
  value: Number(r.value),
  dueDate: r.due_date,
  entryDate: r.entry_date,
  paymentMethod: r.payment_method,
  description: r.description,
  category: r.category,
  notes: r.notes,
  status: r.status,
  createdAt: r.created_at,
});

export function usePendingBoletos() {
  const [boletos, setBoletos] = useState<PendingBoleto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("pending_boletos")
      .select("*")
      .eq("status", "pendente")
      .order("due_date", { ascending: true });
    if (error) {
      console.error("Failed to load pending boletos:", error);
      return;
    }
    setBoletos(((data ?? []) as Row[]).map(mapRow));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [load]);

  const confirmBoleto = useCallback(async (boleto: PendingBoleto) => {
    const date = new Date().toISOString().split("T")[0];
    const { data: { user } } = await supabase.auth.getUser();

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert({
        date,
        description: boleto.description,
        type: "Entrada",
        category: boleto.category,
        value: boleto.value,
        notes: boleto.notes || "",
        month: getMonthFromDate(date),
        locked: false,
        created_by: user?.id ?? null,
      })
      .select()
      .single();

    if (txError) {
      console.error(txError);
      toast.error("Erro ao confirmar boleto");
      return false;
    }

    const { error } = await supabase
      .from("pending_boletos")
      .update({
        status: "confirmado",
        transaction_id: tx.id,
        confirmed_by: user?.id ?? null,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", boleto.id);

    if (error) {
      console.error(error);
      toast.error("Erro ao atualizar boleto");
      return false;
    }

    setBoletos(prev => prev.filter(b => b.id !== boleto.id));
    toast.success("Pagamento confirmado e lançado no fluxo");
    return true;
  }, []);

  const rejectBoleto = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("pending_boletos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      toast.error("Erro ao rejeitar boleto");
      return false;
    }
    setBoletos(prev => prev.filter(b => b.id !== id));
    toast.success("Boleto rejeitado");
    return true;
  }, []);

  return { boletos, loading, reload: load, confirmBoleto, rejectBoleto };
}
