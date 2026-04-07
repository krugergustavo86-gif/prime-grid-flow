import { useState, useCallback } from "react";
import { Transaction, AppConfig } from "@/types";
import { createSeedData, DEFAULT_CONFIG, LOCKED_MONTHS } from "@/utils/seed";
import { getMonthFromDate } from "@/utils/formatters";
import { generateId } from "@/utils/seed";

const TRANSACTIONS_KEY = "primegrid_transactions";
const CONFIG_KEY = "primegrid_config";
const PATRIMONY_KEY = "primegrid_patrimony";

function loadTransactions(ano: number): Transaction[] {
  const stored = localStorage.getItem(TRANSACTIONS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { return createSeedData(ano); }
  }
  const seed = createSeedData(ano);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(seed));
  return seed;
}

function loadConfig(): AppConfig {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch { return DEFAULT_CONFIG; }
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
  return DEFAULT_CONFIG;
}

export function useTransactions() {
  const [config, setConfigState] = useState<AppConfig>(() => loadConfig());
  const [transactions, setTransactionsState] = useState<Transaction[]>(() => loadTransactions(config.ano));

  const saveTransactions = useCallback((txns: Transaction[]) => {
    setTransactionsState(txns);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txns));
  }, []);

  const setConfig = useCallback((newConfig: AppConfig) => {
    setConfigState(newConfig);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
  }, []);

  const addTransaction = useCallback((tx: Omit<Transaction, "id" | "month">) => {
    const month = getMonthFromDate(tx.date);
    const monthNum = month.split("/")[0];
    if (LOCKED_MONTHS.includes(monthNum)) return false;
    const newTx: Transaction = { ...tx, id: generateId(), month };
    saveTransactions([...transactions, newTx]);
    return true;
  }, [transactions, saveTransactions]);

  const updateTransaction = useCallback((id: string, updates: Partial<Omit<Transaction, "id" | "month">>) => {
    const txns = transactions.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...updates };
      if (updates.date) updated.month = getMonthFromDate(updates.date);
      return updated;
    });
    saveTransactions(txns);
    return true;
  }, [transactions, saveTransactions]);

  const deleteTransaction = useCallback((id: string) => {
    saveTransactions(transactions.filter(t => t.id !== id));
  }, [transactions, saveTransactions]);

  const getTransactionsByMonth = useCallback((monthNum: string) => {
    return transactions.filter(t => t.month.startsWith(monthNum + "/"));
  }, [transactions]);

  const isMonthLocked = useCallback((monthNum: string) => {
    return LOCKED_MONTHS.includes(monthNum);
  }, []);

  const clearAllData = useCallback(() => {
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(PATRIMONY_KEY);
    const newConfig = DEFAULT_CONFIG;
    const seed = createSeedData(newConfig.ano);
    setConfigState(newConfig);
    setTransactionsState(seed);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(seed));
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
  }, []);

  const exportData = useCallback(() => {
    const patrimonyStr = localStorage.getItem(PATRIMONY_KEY);
    const patrimony = patrimonyStr ? JSON.parse(patrimonyStr) : null;
    const data = { config, transactions, patrimony };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `primegrid_financeiro_${config.ano}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config, transactions]);

  const importData = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.transactions && data.config) {
            saveTransactions(data.transactions);
            setConfig({ ...DEFAULT_CONFIG, ...data.config });
            if (data.patrimony) {
              localStorage.setItem(PATRIMONY_KEY, JSON.stringify(data.patrimony));
            }
            resolve(true);
          } else {
            resolve(false);
          }
        } catch { resolve(false); }
      };
      reader.readAsText(file);
    });
  }, [saveTransactions, setConfig]);

  return {
    transactions, config, setConfig,
    addTransaction, updateTransaction, deleteTransaction,
    getTransactionsByMonth, isMonthLocked,
    clearAllData, exportData, importData,
  };
}
