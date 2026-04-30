import { useState, useCallback, useEffect } from "react";
import { PatrimonyData, Asset, Receivable, DoubtfulCredit, CashEntry, Loan, Payable } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

const EMPTY: PatrimonyData = { assets: [], receivables: [], doubtfulCredits: [], cashEntries: [], loans: [], payables: [] };

type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
type ReceivableRow = Database["public"]["Tables"]["receivables"]["Row"];
type DoubtfulRow = Database["public"]["Tables"]["doubtful_credits"]["Row"];
type CashRow = Database["public"]["Tables"]["cash_entries"]["Row"];
type LoanRow = Database["public"]["Tables"]["loans"]["Row"];
type PayableRow = Database["public"]["Tables"]["payables"]["Row"];

// camelCase -> snake_case generic mapper for partial updates
const CAMEL_TO_SNAKE: Record<string, string> = {
  group: "asset_group",
  valueFipe: "value_fipe",
  valueMarket: "value_market",
  paidValue: "paid_value",
  dueDate: "due_date",
  refDate: "ref_date",
  nextPayment: "next_payment",
  totalInstallments: "total_installments",
  paidInstallments: "paid_installments",
  installmentValue: "installment_value",
  autoDebit: "auto_debit",
  debitDay: "debit_day",
  debitStartDate: "debit_start_date",
  debitEndDate: "debit_end_date",
  bankAccount: "bank_account",
  debitCategory: "debit_category",
  scheduledDate: "scheduled_date",
};

function toSnake<T extends object>(obj: Partial<T>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[CAMEL_TO_SNAKE[k] ?? k] = v;
  }
  return out;
}

function mapAsset(r: AssetRow): Asset {
  return { id: r.id, group: r.asset_group as Asset["group"], description: r.description, plate: r.plate || undefined, valueFipe: r.value_fipe ? Number(r.value_fipe) : undefined, valueMarket: Number(r.value_market), notes: r.notes || undefined };
}
function mapReceivable(r: ReceivableRow): Receivable {
  return { id: r.id, description: r.description, value: Number(r.value), paidValue: Number(r.paid_value ?? 0), dueDate: r.due_date || undefined, type: r.type as Receivable["type"], status: r.status as Receivable["status"], responsible: r.responsible || undefined, notes: r.notes || undefined };
}
function mapDoubtful(r: DoubtfulRow): DoubtfulCredit {
  return { id: r.id, description: r.description, value: Number(r.value), responsible: r.responsible || undefined, notes: r.notes || undefined };
}
function mapCash(r: CashRow): CashEntry {
  return { id: r.id, description: r.description, balance: Number(r.balance), refDate: r.ref_date, notes: r.notes || undefined };
}
function mapLoan(r: LoanRow): Loan {
  return { id: r.id, contract: r.contract, institution: r.institution, type: r.type as Loan["type"], nextPayment: r.next_payment || undefined, totalInstallments: r.total_installments, paidInstallments: r.paid_installments, installmentValue: Number(r.installment_value), notes: r.notes || undefined, autoDebit: r.auto_debit || false, debitDay: r.debit_day || undefined, debitStartDate: r.debit_start_date || undefined, debitEndDate: r.debit_end_date || undefined, bankAccount: r.bank_account || undefined, debitCategory: r.debit_category || undefined };
}
function mapPayable(r: PayableRow): Payable {
  return { id: r.id, description: r.description, value: Number(r.value), dueDate: r.due_date || undefined, scheduledDate: r.scheduled_date || undefined, responsible: r.responsible, status: r.status as Payable["status"], notes: r.notes || undefined };
}

export function usePatrimony() {
  const [data, setData] = useState<PatrimonyData>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const order = { ascending: false } as const;
      const [a, r, d, c, l, p] = await Promise.all([
        supabase.from("assets").select("*").order("created_at", order),
        supabase.from("receivables").select("*").order("created_at", order),
        supabase.from("doubtful_credits").select("*").order("created_at", order),
        supabase.from("cash_entries").select("*").order("created_at", order),
        supabase.from("loans").select("*").order("created_at", order),
        supabase.from("payables").select("*").order("created_at", order),
      ]);
      if (cancelled) return;
      setData({
        assets: (a.data || []).map(mapAsset),
        receivables: (r.data || []).map(mapReceivable),
        doubtfulCredits: (d.data || []).map(mapDoubtful),
        cashEntries: (c.data || []).map(mapCash),
        loans: (l.data || []).map(mapLoan),
        payables: (p.data || []).map(mapPayable),
      });
    })();
    return () => { cancelled = true; };
  }, []);

  // Assets
  const addAsset = useCallback(async (a: Omit<Asset, "id">) => {
    const { data: row, error } = await supabase.from("assets").insert({ asset_group: a.group, description: a.description, plate: a.plate, value_fipe: a.valueFipe, value_market: a.valueMarket, notes: a.notes }).select().single();
    if (error || !row) { toast.error("Erro ao salvar"); return; }
    setData(prev => ({ ...prev, assets: [mapAsset(row), ...prev.assets] }));
  }, []);

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    const { error } = await supabase.from("assets").update(toSnake(updates) as never).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setData(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? { ...a, ...updates } : a) }));
  }, []);

  const deleteAsset = useCallback(async (id: string) => {
    await supabase.from("assets").delete().eq("id", id);
    setData(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  }, []);

  // Receivables
  const addReceivable = useCallback(async (r: Omit<Receivable, "id">): Promise<boolean> => {
    const { data: row, error } = await supabase.from("receivables").insert({ description: r.description, value: r.value, paid_value: r.paidValue ?? 0, due_date: r.dueDate, type: r.type, status: r.status, responsible: r.responsible, notes: r.notes }).select().single();
    if (error || !row) { console.error("addReceivable error:", error); toast.error(`Erro ao salvar: ${error?.message ?? "desconhecido"}`); return false; }
    setData(prev => ({ ...prev, receivables: [mapReceivable(row), ...prev.receivables] }));
    return true;
  }, []);

  const updateReceivable = useCallback(async (id: string, updates: Partial<Receivable>): Promise<boolean> => {
    const { error } = await supabase.from("receivables").update(toSnake(updates) as never).eq("id", id);
    if (error) { console.error("updateReceivable error:", error); toast.error(`Erro ao atualizar: ${error.message}`); return false; }
    setData(prev => ({ ...prev, receivables: prev.receivables.map(r => r.id === id ? { ...r, ...updates } : r) }));
    return true;
  }, []);

  const deleteReceivable = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("receivables").delete().eq("id", id);
    if (error) { console.error("deleteReceivable error:", error); toast.error(`Erro ao excluir: ${error.message}`); return false; }
    setData(prev => ({ ...prev, receivables: prev.receivables.filter(r => r.id !== id) }));
    return true;
  }, []);

  // Doubtful Credits
  const addDoubtfulCredit = useCallback(async (d: Omit<DoubtfulCredit, "id">) => {
    const { data: row, error } = await supabase.from("doubtful_credits").insert({ description: d.description, value: d.value, responsible: d.responsible, notes: d.notes }).select().single();
    if (error || !row) { toast.error("Erro ao salvar"); return; }
    setData(prev => ({ ...prev, doubtfulCredits: [mapDoubtful(row), ...prev.doubtfulCredits] }));
  }, []);

  const updateDoubtfulCredit = useCallback(async (id: string, updates: Partial<DoubtfulCredit>) => {
    const { error } = await supabase.from("doubtful_credits").update(toSnake(updates) as never).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setData(prev => ({ ...prev, doubtfulCredits: prev.doubtfulCredits.map(d => d.id === id ? { ...d, ...updates } : d) }));
  }, []);

  const deleteDoubtfulCredit = useCallback(async (id: string) => {
    await supabase.from("doubtful_credits").delete().eq("id", id);
    setData(prev => ({ ...prev, doubtfulCredits: prev.doubtfulCredits.filter(d => d.id !== id) }));
  }, []);

  // Cash Entries
  const updateCashEntry = useCallback(async (id: string, updates: Partial<CashEntry>) => {
    const { error } = await supabase.from("cash_entries").update(toSnake(updates) as never).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setData(prev => ({ ...prev, cashEntries: prev.cashEntries.map(c => c.id === id ? { ...c, ...updates } : c) }));
  }, []);

  // Loans
  const addLoan = useCallback(async (l: Omit<Loan, "id">) => {
    const { data: row, error } = await supabase.from("loans").insert({ contract: l.contract, institution: l.institution, type: l.type, next_payment: l.nextPayment, total_installments: l.totalInstallments, paid_installments: l.paidInstallments, installment_value: l.installmentValue, notes: l.notes, auto_debit: l.autoDebit || false, debit_day: l.debitDay, debit_start_date: l.debitStartDate, debit_end_date: l.debitEndDate, bank_account: l.bankAccount, debit_category: l.debitCategory }).select().single();
    if (error || !row) { toast.error("Erro ao salvar"); return; }
    setData(prev => ({ ...prev, loans: [mapLoan(row), ...prev.loans] }));
  }, []);

  const updateLoan = useCallback(async (id: string, updates: Partial<Loan>) => {
    const { error } = await supabase.from("loans").update(toSnake(updates) as never).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setData(prev => ({ ...prev, loans: prev.loans.map(l => l.id === id ? { ...l, ...updates } : l) }));
  }, []);

  const deleteLoan = useCallback(async (id: string) => {
    await supabase.from("loans").delete().eq("id", id);
    setData(prev => ({ ...prev, loans: prev.loans.filter(l => l.id !== id) }));
  }, []);

  // Payables
  const addPayable = useCallback(async (p: Omit<Payable, "id">) => {
    const { data: row, error } = await supabase.from("payables").insert({ description: p.description, value: p.value, due_date: p.dueDate, scheduled_date: p.scheduledDate, responsible: p.responsible, status: p.status, notes: p.notes }).select().single();
    if (error || !row) { toast.error("Erro ao salvar"); return; }
    setData(prev => ({ ...prev, payables: [mapPayable(row), ...prev.payables] }));
  }, []);

  const updatePayable = useCallback(async (id: string, updates: Partial<Payable>) => {
    const { error } = await supabase.from("payables").update(toSnake(updates) as never).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setData(prev => ({ ...prev, payables: prev.payables.map(p => p.id === id ? { ...p, ...updates } : p) }));
  }, []);

  const deletePayable = useCallback(async (id: string) => {
    await supabase.from("payables").delete().eq("id", id);
    setData(prev => ({ ...prev, payables: prev.payables.filter(p => p.id !== id) }));
  }, []);

  return {
    ...data,
    addAsset, updateAsset, deleteAsset,
    addReceivable, updateReceivable, deleteReceivable,
    addDoubtfulCredit, updateDoubtfulCredit, deleteDoubtfulCredit,
    updateCashEntry,
    addLoan, updateLoan, deleteLoan,
    addPayable, updatePayable, deletePayable,
  };
}
