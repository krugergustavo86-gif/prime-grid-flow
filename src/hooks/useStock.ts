import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Cast to loose type until generated types include the new tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseClient as any;

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unitValue: number;
  notes?: string;
}

export interface StockHistoryEntry {
  id: string;
  stockItemId: string;
  oldQuantity: number;
  newQuantity: number;
  changedAt: string;
}

interface StockItemRow { id: string; name: string; quantity: number | string; unit_value: number | string; notes: string | null }
interface StockHistoryRow { id: string; stock_item_id: string; old_quantity: number | string; new_quantity: number | string; changed_at: string }

function mapItem(r: StockItemRow): StockItem {
  return { id: r.id, name: r.name, quantity: Number(r.quantity), unitValue: Number(r.unit_value), notes: r.notes || undefined };
}
function mapHistory(r: StockHistoryRow): StockHistoryEntry {
  return { id: r.id, stockItemId: r.stock_item_id, oldQuantity: Number(r.old_quantity), newQuantity: Number(r.new_quantity), changedAt: r.changed_at };
}

export function useStock() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        (supabase.from("stock_items" as never) as never).select("id, name, quantity, unit_value, notes").order("created_at", { ascending: false }),
        (supabase.from("stock_history" as never) as never).select("id, stock_item_id, old_quantity, new_quantity, changed_at").order("changed_at", { ascending: false }),
      ]) as [{ data: StockItemRow[] | null; error: unknown }, { data: StockHistoryRow[] | null; error: unknown }];
      setItems((a.data || []).map(mapItem));
      setHistory((b.data || []).map(mapHistory));
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar estoque");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = useCallback(async (item: Omit<StockItem, "id">) => {
    try {
      const { data, error } = await (supabase.from("stock_items" as never) as never)
        .insert({ name: item.name, quantity: item.quantity, unit_value: item.unitValue, notes: item.notes })
        .select().single() as { data: StockItemRow | null; error: { message: string } | null };
      if (error || !data) { toast.error(`Erro ao salvar: ${error?.message ?? "desconhecido"}`); return false; }
      setItems(prev => [mapItem(data), ...prev]);
      return true;
    } catch (e) { toast.error("Erro ao salvar"); return false; }
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<StockItem>) => {
    try {
      const current = items.find(i => i.id === id);
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.quantity !== undefined) payload.quantity = updates.quantity;
      if (updates.unitValue !== undefined) payload.unit_value = updates.unitValue;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      const { error } = await (supabase.from("stock_items" as never) as never).update(payload).eq("id", id) as { error: { message: string } | null };
      if (error) { toast.error(`Erro ao atualizar: ${error.message}`); return false; }
      // Log history if quantity changed
      if (current && updates.quantity !== undefined && updates.quantity !== current.quantity) {
        const { data: histRow } = await (supabase.from("stock_history" as never) as never)
          .insert({ stock_item_id: id, old_quantity: current.quantity, new_quantity: updates.quantity })
          .select().single() as { data: StockHistoryRow | null };
        if (histRow) setHistory(prev => [mapHistory(histRow), ...prev]);
      }
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
      return true;
    } catch (e) { toast.error("Erro ao atualizar"); return false; }
  }, [items]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error } = await (supabase.from("stock_items" as never) as never).delete().eq("id", id) as { error: { message: string } | null };
      if (error) { toast.error(`Erro ao excluir: ${error.message}`); return false; }
      setItems(prev => prev.filter(i => i.id !== id));
      setHistory(prev => prev.filter(h => h.stockItemId !== id));
      return true;
    } catch (e) { toast.error("Erro ao excluir"); return false; }
  }, []);

  const totalValue = items.reduce((s, i) => s + i.quantity * i.unitValue, 0);

  return { items, history, addItem, updateItem, deleteItem, totalValue, reload: load };
}
