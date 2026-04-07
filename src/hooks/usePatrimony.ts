import { useState, useCallback, useEffect } from "react";
import { PatrimonyData, Asset, Receivable, DoubtfulCredit, CashEntry, Loan, Payable } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EMPTY: PatrimonyData = { assets: [], receivables: [], doubtfulCredits: [], cashEntries: [], loans: [], payables: [] };

function mapAsset(r: any): Asset {
  return { id: r.id, group: r.asset_group, description: r.description, plate: r.plate || undefined, valueFipe: r.value_fipe ? Number(r.value_fipe) : undefined, valueMarket: Number(r.value_market), notes: r.notes || undefined };
}
function mapReceivable(r: any): Receivable {
  return { id: r.id, description: r.description, value: Number(r.value), dueDate: r.due_date || undefined, type: r.type, status: r.status, responsible: r.responsible || undefined, notes: r.notes || undefined };
}
function mapDoubtful(r: any): DoubtfulCredit {
  return { id: r.id, description: r.description, value: Number(r.value), responsible: r.responsible || undefined, notes: r.notes || undefined };
}
function mapCash(r: any): CashEntry {
  return { id: r.id, description: r.description, balance: Number(r.balance), refDate: r.ref_date, notes: r.notes || undefined };
}
function mapLoan(r: any): Loan {
  return { id: r.id, contract: r.contract, institution: r.institution, type: r.type, nextPayment: r.next_payment || undefined, totalInstallments: r.total_installments, paidInstallments: r.paid_installments, installmentValue: Number(r.installment_value), notes: r.notes || undefined };
}
function mapPayable(r: any): Payable {
  return { id: r.id, description: r.description, value: Number(r.value), dueDate: r.due_date || undefined, scheduledDate: r.scheduled_date || undefined, responsible: r.responsible, status: r.status, notes: r.notes || undefined };
}

export function usePatrimony() {
  const [data, setData] = useState<PatrimonyData>(EMPTY);

  useEffect(() => {
    const fetch = async () => {
      const [a, r, d, c, l, p] = await Promise.all([
        supabase.from("assets").select("*"),
        supabase.from("receivables").select("*"),
        supabase.from("doubtful_credits").select("*"),
        supabase.from("cash_entries").select("*"),
        supabase.from("loans").select("*"),
        supabase.from("payables").select("*"),
      ]);
      setData({
        assets: (a.data || []).map(mapAsset),
        receivables: (r.data || []).map(mapReceivable),
        doubtfulCredits: (d.data || []).map(mapDoubtful),
        cashEntries: (c.data || []).map(mapCash),
        loans: (l.data || []).map(mapLoan),
        payables: (p.data || []).map(mapPayable),
      });
    };
    fetch();
  }, []);

  // Assets
  const addAsset = useCallback(async (a: Omit<Asset, "id">) => {
    const { data: row, error } = await supabase.from("assets").insert({ asset_group: a.group, description: a.description, plate: a.plate, value_fipe: a.valueFipe, value_market: a.valueMarket, notes: a.notes }).select().single();
    if (error) { toast.error("Erro ao salvar"); return; }
    setData(prev => ({ ...prev, assets: [...prev.assets, mapAsset(row)] }));
  }, []);

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    const dbUpdates: any = {};
    if (updates.group !== undefined) dbUpdates.asset_group = updates.group;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.plate !== undefined) dbUpdates.plate = updates.plate;
    if (updates.valueFipe !== undefined) dbUpdates.value_fipe = updates.valueFipe;
    if (updates.valueMarket !== undefined) dbUpdates.value_market = updates.valueMarket;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    const { error } = await supabase.from("assets").update(dbUpdates).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setData(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? { ...a, ...updates } : a) }));
  }, []);

  const deleteAsset = useCallback(async (id: string) => {
    await supabase.from("assets").delete().eq("id", id);
    setData(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  }, []);

  // Receivables
  const addReceivable = useCallback(async (r: Omit<Receivable, "id">) => {
    const { data: row, error } = await supabase.from("receivables").insert({ description: r.description, value: r.value, due_date: r.dueDate, type: r.type, status: r.status, responsible: r.responsible, notes: r.notes }).select().single();
    if (error) { toast.error("Erro ao salvar"); return; }
    setData(prev => ({ ...prev, receivables: [...prev.receivables, mapReceivable(row)] }));
  }, []);

  const updateReceivable = useCallback(async (id: string, updates: Partial<Receivable>) => {
    const dbUpdates: any = {};
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.responsible !== undefined) dbUpdates.responsible = updates.responsible;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    await supabase.from("receivables").update(dbUpdates).eq("id", id);
    setData(prev => ({ ...prev, receivables: prev.receivables.map(r => r.id === id ? { ...r, ...updates } : r) }));
  }, []);

  const deleteReceivable = useCallback(async (id: string) => {
    await supabase.from("receivables").delete().eq("id", id);
    setData(prev => ({ ...prev, receivables: prev.receivables.filter(r => r.id !== id) }));
  }, []);

  // Doubtful Credits
  const addDoubtfulCredit = useCallback(async (d: Omit<DoubtfulCredit, "id">) => {
    const { data: row, error } = await supabase.from("doubtful_credits").insert({ description: d.description, value: d.value, responsible: d.responsible, notes: d.notes }).select().single();
    if (error) { toast.error("Erro ao salvar"); return; }
    setData(prev => ({ ...prev, doubtfulCredits: [...prev.doubtfulCredits, mapDoubtful(row)] }));
  }, []);

  const updateDoubtfulCredit = useCallback(async (id: string, updates: Partial<DoubtfulCredit>) => {
    const dbUpdates: any = {};
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.responsible !== undefined) dbUpdates.responsible = updates.responsible;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    await supabase.from("doubtful_credits").update(dbUpdates).eq("id", id);
    setData(prev => ({ ...prev, doubtfulCredits: prev.doubtfulCredits.map(d => d.id === id ? { ...d, ...updates } : d) }));
  }, []);

  const deleteDoubtfulCredit = useCallback(async (id: string) => {
    await supabase.from("doubtful_credits").delete().eq("id", id);
    setData(prev => ({ ...prev, doubtfulCredits: prev.doubtfulCredits.filter(d => d.id !== id) }));
  }, []);

  // Cash Entries
  const updateCashEntry = useCallback(async (id: string, updates: Partial<CashEntry>) => {
    const dbUpdates: any = {};
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
    if (updates.refDate !== undefined) dbUpdates.ref_date = updates.refDate;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    await supabase.from("cash_entries").update(dbUpdates).eq("id", id);
    setData(prev => ({ ...prev, cashEntries: prev.cashEntries.map(c => c.id === id ? { ...c, ...updates } : c) }));
  }, []);

  // Loans
  const addLoan = useCallback(async (l: Omit<Loan, "id">) => {
    const { data: row, error } = await supabase.from("loans").insert({ contract: l.contract, institution: l.institution, type: l.type, next_payment: l.nextPayment, total_installments: l.totalInstallments, paid_installments: l.paidInstallments, installment_value: l.installmentValue, notes: l.notes }).select().single();
    if (error) { toast.error("Erro ao salvar"); return; }
    setData(prev => ({ ...prev, loans: [...prev.loans, mapLoan(row)] }));
  }, []);

  const updateLoan = useCallback(async (id: string, updates: Partial<Loan>) => {
    const dbUpdates: any = {};
    if (updates.contract !== undefined) dbUpdates.contract = updates.contract;
    if (updates.institution !== undefined) dbUpdates.institution = updates.institution;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.nextPayment !== undefined) dbUpdates.next_payment = updates.nextPayment;
    if (updates.totalInstallments !== undefined) dbUpdates.total_installments = updates.totalInstallments;
    if (updates.paidInstallments !== undefined) dbUpdates.paid_installments = updates.paidInstallments;
    if (updates.installmentValue !== undefined) dbUpdates.installment_value = updates.installmentValue;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    await supabase.from("loans").update(dbUpdates).eq("id", id);
    setData(prev => ({ ...prev, loans: prev.loans.map(l => l.id === id ? { ...l, ...updates } : l) }));
  }, []);

  const deleteLoan = useCallback(async (id: string) => {
    await supabase.from("loans").delete().eq("id", id);
    setData(prev => ({ ...prev, loans: prev.loans.filter(l => l.id !== id) }));
  }, []);

  // Payables
  const addPayable = useCallback(async (p: Omit<Payable, "id">) => {
    const { data: row, error } = await supabase.from("payables").insert({ description: p.description, value: p.value, due_date: p.dueDate, responsible: p.responsible, status: p.status, notes: p.notes }).select().single();
    if (error) { toast.error("Erro ao salvar"); return; }
    setData(prev => ({ ...prev, payables: [...prev.payables, mapPayable(row)] }));
  }, []);

  const updatePayable = useCallback(async (id: string, updates: Partial<Payable>) => {
    const dbUpdates: any = {};
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.responsible !== undefined) dbUpdates.responsible = updates.responsible;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    await supabase.from("payables").update(dbUpdates).eq("id", id);
    setData(prev => ({ ...prev, payables: prev.payables.map(p => p.id === id ? { ...p, ...updates } : p) }));
  }, []);

  const deletePayable = useCallback(async (id: string) => {
    await supabase.from("payables").delete().eq("id", id);
    setData(prev => ({ ...prev, payables: prev.payables.filter(p => p.id !== id) }));
  }, []);

  const clearPatrimony = useCallback(() => {
    toast.error("Função desabilitada no modo banco de dados");
  }, []);

  const getExportData = useCallback(() => data, [data]);

  const importPatrimony = useCallback((_imported: PatrimonyData) => {
    toast.error("Use a importação pela tela de Configurações");
  }, []);

  return {
    ...data,
    addAsset, updateAsset, deleteAsset,
    addReceivable, updateReceivable, deleteReceivable,
    addDoubtfulCredit, updateDoubtfulCredit, deleteDoubtfulCredit,
    updateCashEntry,
    addLoan, updateLoan, deleteLoan,
    addPayable, updatePayable, deletePayable,
    clearPatrimony, getExportData, importPatrimony,
  };
}
