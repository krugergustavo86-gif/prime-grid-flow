import { Transaction } from "@/types";

export function generateId(): string {
  return crypto.randomUUID();
}

export const LOCKED_MONTHS = ["01", "02", "03"];

export const LOCKED_BALANCES: Record<string, number> = {
  "01": -246208.13,
  "02": 6358.93,
  "03": 195974.62,
};

export function createSeedData(ano: number): Transaction[] {
  return [
    {
      id: generateId(),
      date: `${ano}-01-31`,
      description: "Consolidado Janeiro - Entradas",
      type: "Entrada",
      category: "Energia Solar",
      value: 1965652.77,
      month: `01/${ano}`,
    },
    {
      id: generateId(),
      date: `${ano}-01-31`,
      description: "Consolidado Janeiro - Saídas",
      type: "Saída",
      category: "Solar Kits",
      value: 2211860.90,
      month: `01/${ano}`,
    },
    {
      id: generateId(),
      date: `${ano}-02-28`,
      description: "Consolidado Fevereiro - Entradas",
      type: "Entrada",
      category: "Energia Solar",
      value: 1937195.87,
      month: `02/${ano}`,
    },
    {
      id: generateId(),
      date: `${ano}-02-28`,
      description: "Consolidado Fevereiro - Saídas",
      type: "Saída",
      category: "Solar Kits",
      value: 1930836.94,
      month: `02/${ano}`,
    },
    {
      id: generateId(),
      date: `${ano}-03-31`,
      description: "Consolidado Março - Entradas",
      type: "Entrada",
      category: "Energia Solar",
      value: 1500000.00,
      month: `03/${ano}`,
    },
    {
      id: generateId(),
      date: `${ano}-03-31`,
      description: "Consolidado Março - Saídas",
      type: "Saída",
      category: "Solar Kits",
      value: 1304025.38,
      month: `03/${ano}`,
    },
  ];
}

export const DEFAULT_CONFIG = {
  saldoAnterior: 409000,
  ano: 2026,
};
