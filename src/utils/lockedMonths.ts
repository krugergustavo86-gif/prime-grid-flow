/**
 * Fonte única de verdade para meses fechados.
 * Chave: "MM/YYYY" (mesmo formato da coluna `transactions.month`).
 * Valor: balanço oficial fechado do mês (substitui o cálculo entradas - saídas).
 */
export const LOCKED_BALANCES: Record<string, number> = {
  "01/2026": -246208.13,
  "02/2026": 6358.93,
  "03/2026": 195974.62,
};

function key(monthNum: string, year: number | string) {
  return `${monthNum}/${year}`;
}

export function isMonthLocked(monthNum: string, year: number | string): boolean {
  return key(monthNum, year) in LOCKED_BALANCES;
}

export function isMonthKeyLocked(monthKey: string): boolean {
  return monthKey in LOCKED_BALANCES;
}

export function getLockedBalance(monthNum: string, year: number | string): number | undefined {
  return LOCKED_BALANCES[key(monthNum, year)];
}
