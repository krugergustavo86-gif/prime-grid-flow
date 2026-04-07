import { useState, useCallback } from "react";
import { PatrimonyData, Asset, Receivable, DoubtfulCredit, CashEntry, Loan, Payable } from "@/types";
import { createPatrimonySeed, generateId } from "@/utils/seed";

const PATRIMONY_KEY = "primegrid_patrimony";

function loadPatrimony(): PatrimonyData {
  const stored = localStorage.getItem(PATRIMONY_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* fall through */ }
  }
  const seed = createPatrimonySeed();
  localStorage.setItem(PATRIMONY_KEY, JSON.stringify(seed));
  return seed;
}

function save(data: PatrimonyData) {
  localStorage.setItem(PATRIMONY_KEY, JSON.stringify(data));
}

export function usePatrimony() {
  const [data, setData] = useState<PatrimonyData>(() => loadPatrimony());

  const update = useCallback((next: PatrimonyData) => {
    setData(next);
    save(next);
  }, []);

  // Assets
  const addAsset = useCallback((a: Omit<Asset, "id">) => {
    const next = { ...data, assets: [...data.assets, { ...a, id: generateId() }] };
    update(next);
  }, [data, update]);

  const updateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    const next = { ...data, assets: data.assets.map(a => a.id === id ? { ...a, ...updates } : a) };
    update(next);
  }, [data, update]);

  const deleteAsset = useCallback((id: string) => {
    update({ ...data, assets: data.assets.filter(a => a.id !== id) });
  }, [data, update]);

  // Receivables
  const addReceivable = useCallback((r: Omit<Receivable, "id">) => {
    update({ ...data, receivables: [...data.receivables, { ...r, id: generateId() }] });
  }, [data, update]);

  const updateReceivable = useCallback((id: string, updates: Partial<Receivable>) => {
    update({ ...data, receivables: data.receivables.map(r => r.id === id ? { ...r, ...updates } : r) });
  }, [data, update]);

  const deleteReceivable = useCallback((id: string) => {
    update({ ...data, receivables: data.receivables.filter(r => r.id !== id) });
  }, [data, update]);

  // Doubtful Credits
  const addDoubtfulCredit = useCallback((d: Omit<DoubtfulCredit, "id">) => {
    update({ ...data, doubtfulCredits: [...data.doubtfulCredits, { ...d, id: generateId() }] });
  }, [data, update]);

  const updateDoubtfulCredit = useCallback((id: string, updates: Partial<DoubtfulCredit>) => {
    update({ ...data, doubtfulCredits: data.doubtfulCredits.map(d => d.id === id ? { ...d, ...updates } : d) });
  }, [data, update]);

  const deleteDoubtfulCredit = useCallback((id: string) => {
    update({ ...data, doubtfulCredits: data.doubtfulCredits.filter(d => d.id !== id) });
  }, [data, update]);

  // Cash Entries
  const updateCashEntry = useCallback((id: string, updates: Partial<CashEntry>) => {
    update({ ...data, cashEntries: data.cashEntries.map(c => c.id === id ? { ...c, ...updates } : c) });
  }, [data, update]);

  // Loans
  const addLoan = useCallback((l: Omit<Loan, "id">) => {
    update({ ...data, loans: [...data.loans, { ...l, id: generateId() }] });
  }, [data, update]);

  const updateLoan = useCallback((id: string, updates: Partial<Loan>) => {
    update({ ...data, loans: data.loans.map(l => l.id === id ? { ...l, ...updates } : l) });
  }, [data, update]);

  const deleteLoan = useCallback((id: string) => {
    update({ ...data, loans: data.loans.filter(l => l.id !== id) });
  }, [data, update]);

  // Payables
  const addPayable = useCallback((p: Omit<Payable, "id">) => {
    update({ ...data, payables: [...data.payables, { ...p, id: generateId() }] });
  }, [data, update]);

  const updatePayable = useCallback((id: string, updates: Partial<Payable>) => {
    update({ ...data, payables: data.payables.map(p => p.id === id ? { ...p, ...updates } : p) });
  }, [data, update]);

  const deletePayable = useCallback((id: string) => {
    update({ ...data, payables: data.payables.filter(p => p.id !== id) });
  }, [data, update]);

  const clearPatrimony = useCallback(() => {
    const seed = createPatrimonySeed();
    update(seed);
  }, [update]);

  const getExportData = useCallback(() => data, [data]);

  const importPatrimony = useCallback((imported: PatrimonyData) => {
    update(imported);
  }, [update]);

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
