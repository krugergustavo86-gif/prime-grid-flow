import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Meses fechados para EDIÇÃO (tabela fechamentos_mensais; o banco também bloqueia via trigger).
 * Não afeta cálculo: o balanço de todo mês é sempre entradas - saídas (ver monthlyTotals.ts).
 * Chave: "MM/YYYY".
 */
let locked = new Set<string>(["01/2026", "02/2026", "03/2026"]);
let version = 0;
const listeners = new Set<() => void>();

function emit() { version++; listeners.forEach(l => l()); }

export async function loadLockedMonths() {
  const { data, error } = await supabase.from("fechamentos_mensais").select("month");
  if (error) return;
  locked = new Set((data ?? []).map(r => r.month));
  emit();
}

export function useLockedMonthsVersion() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => version,
  );
}

export function getLockedMonthKeys(): string[] { return Array.from(locked); }

export function isMonthLocked(monthNum: string, year: number | string): boolean {
  return locked.has(`${monthNum}/${year}`);
}

export function isMonthKeyLocked(monthKey: string): boolean {
  return locked.has(monthKey);
}
