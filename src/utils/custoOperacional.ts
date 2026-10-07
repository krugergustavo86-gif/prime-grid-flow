import { Transaction } from "@/types";
import { computeMonthlyTotals } from "./monthlyTotals";
import { groupOf } from "./categories";

/** Grupos usados nos indicadores de custo (demais grupos ficam fora). */
export const GRUPOS_CUSTO = ["Custo direto", "Pessoal (folha)", "Despesas operacionais"] as const;
export const GRUPO_RECEITA = "Receita operacional";

export interface MesCusto {
  key: string; // YYYY-MM
  receita: number;
  custoDireto: number;
  pessoal: number;
  despOp: number;
  custoOp: number;
  custoFixo: number;
  kits: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Totais por mês por grupo, a partir da fonte única computeMonthlyTotals. */
export function custosPorMes(txns: Transaction[]): Record<string, MesCusto> {
  const totals = computeMonthlyTotals(txns);
  const out: Record<string, MesCusto> = {};
  for (const [key, m] of Object.entries(totals)) {
    const g: Record<string, number> = {};
    for (const k of Object.keys(m.byCategory)) {
      const { type, value } = m.byCategory[k];
      const grp = groupOf(type, k.slice(k.indexOf("|") + 1));
      const gk = `${type}|${grp}`;
      g[gk] = (g[gk] ?? 0) + value;
    }
    const custoDireto = r2(g["Saída|Custo direto"] ?? 0);
    const pessoal = r2(g["Saída|Pessoal (folha)"] ?? 0);
    const despOp = r2(g["Saída|Despesas operacionais"] ?? 0);
    const kits = r2(m.byCategory["Saída|Kits Solar/BESS"]?.value ?? 0);
    out[key] = {
      key, receita: r2(g[`Entrada|${GRUPO_RECEITA}`] ?? 0), custoDireto, pessoal, despOp,
      custoOp: r2(custoDireto + pessoal + despOp), custoFixo: r2(pessoal + despOp), kits,
    };
  }
  return out;
}

const vazio = (key: string): MesCusto => ({ key, receita: 0, custoDireto: 0, pessoal: 0, despOp: 0, custoOp: 0, custoFixo: 0, kits: 0 });

export function mesKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface IndicadoresCusto {
  meses: MesCusto[]; // últimos N meses completos (antigo → recente)
  atual: MesCusto;
  custoOpMedio: number;
  custoFixoMedio: number;
  receitaMedia: number;
  custoDiretoMedio: number;
  margemContrib: number | null; // fração
  pontoEquilibrio: number | null;
  folga: number | null; // fração
}

/** Média dos N meses completos anteriores ao mês corrente. */
export function indicadoresCusto(txns: Transaction[], n: number, hoje = new Date()): IndicadoresCusto {
  const pm = custosPorMes(txns);
  const meses: MesCusto[] = [];
  for (let i = n; i >= 1; i--) {
    const k = mesKey(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1));
    meses.push(pm[k] ?? vazio(k));
  }
  // Meses sem nenhum lançamento (antes do início do sistema) não entram no divisor.
  const comDados = meses.filter(m => pm[m.key]);
  const div = Math.max(comDados.length, 1);
  const avg = (f: (m: MesCusto) => number) => r2(comDados.reduce((s, m) => s + f(m), 0) / div);
  const receitaMedia = avg(m => m.receita);
  const custoDiretoMedio = avg(m => m.custoDireto);
  const custoFixoMedio = avg(m => m.custoFixo);
  const margemContrib = receitaMedia > 0 ? (receitaMedia - custoDiretoMedio) / receitaMedia : null;
  const pontoEquilibrio = margemContrib && margemContrib > 0 ? r2(custoFixoMedio / margemContrib) : null;
  const folga = pontoEquilibrio ? receitaMedia / pontoEquilibrio - 1 : null;
  const ak = mesKey(hoje);
  return {
    meses: comDados.length ? comDados : meses, atual: pm[ak] ?? vazio(ak), custoOpMedio: avg(m => m.custoOp), custoFixoMedio,
    receitaMedia, custoDiretoMedio, margemContrib, pontoEquilibrio, folga,
  };
}
