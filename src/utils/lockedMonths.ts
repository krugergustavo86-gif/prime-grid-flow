/**
 * Meses fechados para EDIÇÃO (não podem receber/alterar lançamentos).
 * Não afeta cálculo: o balanço de todo mês é sempre entradas - saídas (ver monthlyTotals.ts).
 * Chave: "MM/YYYY".
 */
export const LOCKED_MONTH_KEYS: string[] = ["01/2026", "02/2026", "03/2026"];

export function isMonthLocked(monthNum: string, year: number | string): boolean {
  return LOCKED_MONTH_KEYS.includes(`${monthNum}/${year}`);
}

export function isMonthKeyLocked(monthKey: string): boolean {
  return LOCKED_MONTH_KEYS.includes(monthKey);
}
