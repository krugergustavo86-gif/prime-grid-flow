import { Transaction } from "@/types";
import type { ContaBancaria } from "@/hooks/useContasBancarias";

const r2 = (n: number) => Math.round(n * 100) / 100;
const signed = (t: Transaction) => (t.type === "Entrada" ? t.value : -t.value);

/**
 * Saldo por conta numa data (inclusive).
 * Conta com abertura: saldo_abertura + lançamentos da conta com data > data_abertura.
 * Conta "Histórico consolidado" = caixa total (saldo anterior + todos os lançamentos) − demais contas,
 * por isso a soma das contas é sempre igual ao Caixa Atual de monthlyTotals.
 */
export function saldosPorConta(
  contas: ContaBancaria[], txns: Transaction[], saldoAnterior: number, ate?: string,
): Record<string, number> {
  const upTo = txns.filter(t => !ate || t.date <= ate);
  const global = saldoAnterior + upTo.reduce((s, t) => s + signed(t), 0);
  const out: Record<string, number> = {};
  let others = 0;
  for (const c of contas) {
    if (c.historico) continue;
    const ab = c.data_abertura;
    const useAb = ab && (!ate || ate >= ab);
    const v = (useAb ? c.saldo_abertura : 0) + upTo
      .filter(t => t.conta_id === c.id && (!useAb || t.date > ab!))
      .reduce((s, t) => s + signed(t), 0);
    out[c.id] = r2(v);
    others += v;
  }
  const hist = contas.find(c => c.historico);
  if (hist) out[hist.id] = r2(global - others);
  return out;
}
