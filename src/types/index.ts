export interface Transaction {
  id: string;
  date: string; // "YYYY-MM-DD"
  description: string;
  type: "Saída" | "Entrada";
  category: string;
  value: number;
  notes?: string;
  month: string; // "MM/YYYY"
}

export interface AppConfig {
  saldoAnterior: number;
  ano: number;
}

export interface MonthSummary {
  month: string; // "01" to "12"
  label: string;
  entradas: number;
  saidas: number;
  balanco: number;
  saldoAcumulado: number;
  locked: boolean;
}

export type TransactionType = "Saída" | "Entrada";
