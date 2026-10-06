import { Transaction } from "@/types";

/**
 * FONTE ÚNICA dos totais mensais do caixa.
 * Critério: mês da DATA do lançamento (campo `date`, "YYYY-MM-DD", já no calendário
 * America/Sao_Paulo — é uma data pura, sem horário). Boletos não pagos ficam em outra
 * tabela (pending_boletos) e nunca entram aqui.
 */

/** Categorias não operacionais: contam no caixa, mas ficam fora de DRE, relatórios por categoria e indicadores. */
export const NON_OPERATIONAL_CATEGORIES = ["Ajuste de implantação (planilha)"];

export function isOperational(t: Pick<Transaction, "category">): boolean {
  return !NON_OPERATIONAL_CATEGORIES.includes(t.category);
}

/** "YYYY-MM" da data do lançamento. */
export function monthKeyOf(t: Pick<Transaction, "date">): string {
  return t.date.slice(0, 7);
}

export function toMonthKey(monthNum: string, year: number | string): string {
  return `${year}-${monthNum}`;
}

export function filterByMonth<T extends Pick<Transaction, "date">>(txns: T[], monthNum: string, year: number | string): T[] {
  const key = toMonthKey(monthNum, year);
  return txns.filter(t => monthKeyOf(t) === key);
}

export interface MonthTotals {
  entradas: number;
  saidas: number;
  balanco: number;
  byCategory: Record<string, { type: Transaction["type"]; value: number }>;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function sumTotals(txns: Transaction[]): MonthTotals {
  let entradas = 0, saidas = 0;
  const byCategory: MonthTotals["byCategory"] = {};
  for (const t of txns) {
    if (t.type === "Entrada") entradas += t.value; else saidas += t.value;
    const k = `${t.type}|${t.category}`;
    byCategory[k] = { type: t.type, value: (byCategory[k]?.value ?? 0) + t.value };
  }
  entradas = round2(entradas);
  saidas = round2(saidas);
  return { entradas, saidas, balanco: round2(entradas - saidas), byCategory };
}

/** Totais por mês ("YYYY-MM") de todos os lançamentos informados. */
export function computeMonthlyTotals(txns: Transaction[]): Record<string, MonthTotals> {
  const groups: Record<string, Transaction[]> = {};
  for (const t of txns) (groups[monthKeyOf(t)] ||= []).push(t);
  const out: Record<string, MonthTotals> = {};
  for (const k of Object.keys(groups)) out[k] = sumTotals(groups[k]);
  return out;
}
