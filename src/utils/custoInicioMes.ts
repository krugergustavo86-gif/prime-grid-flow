import { Transaction } from "@/types";
import { computeMonthlyTotals } from "./monthlyTotals";
import { indicadoresCusto } from "./custoOperacional";
import { PLANO_DE_CONTAS, LOAN_CATEGORY } from "./categories";

export const PERIODO_INICIAL = 6;
const categoriasGrupo = (grupo: string) => PLANO_DE_CONTAS.find(g => g.tipo === "Saída" && g.grupo === grupo)?.categorias ?? [];
export const GRUPOS_INICIO = [
  { nome: "Comissões e taxas técnicas", categorias: ["Comissões e taxas técnicas"] },
  { nome: "Materiais", categorias: ["Materiais gerais", "Kits Solar/BESS", "Geradores (peças e equipamentos)"] },
  { nome: "Combustível", categorias: ["Combustível"] },
  { nome: "Folha e pessoal", categorias: categoriasGrupo("Pessoal (folha)") },
  { nome: "Outros operacionais", categorias: categoriasGrupo("Despesas operacionais").filter(c => c !== "Combustível") },
] as const;
export const ADICIONAIS_INICIO = [
  { nome: "Impostos", categorias: ["Impostos"] },
  { nome: "Parcelas de empréstimos/financiamentos/consórcios", categorias: [LOAN_CATEGORY] },
];
const r2 = (n: number) => Math.round(n * 100) / 100;

export function custoInicioMes(transactions: Transaction[], n = PERIODO_INICIAL, hoje = new Date()) {
  const custos = indicadoresCusto(transactions, n, hoje);
  const totals = computeMonthlyTotals(transactions);
  const meses = custos.meses.filter(m => totals[m.key]).map(m => m.key);
  const divisor = Math.max(meses.length, 1);
  const grupos = [...GRUPOS_INICIO, ...ADICIONAIS_INICIO].map(g => {
    const categorias = g.categorias.map(nome => {
      const valores = meses.map(mes => ({ mes, valor: totals[mes].byCategory[`Saída|${nome}`]?.value ?? 0 }));
      return { nome, valores, media: r2(valores.reduce((s, v) => s + v.valor, 0) / divisor) };
    });
    const valores = meses.map(mes => ({ mes, valor: r2(g.categorias.reduce((s, c) => s + (totals[mes].byCategory[`Saída|${c}`]?.value ?? 0), 0)) }));
    return { nome: g.nome, categorias, valores, media: r2(valores.reduce((s, v) => s + v.valor, 0) / divisor) };
  });
  const impostos = grupos[5].media;
  const parcelas = grupos[6].media;
  const semClassificar = r2(meses.reduce((s, m) => s + (totals[m].byCategory["Saída|A classificar"]?.value ?? 0), 0));
  return { meses, grupos, totalOperacional: custos.custoOpMedio, impostos, parcelas,
    totalAmpliado: r2(custos.custoOpMedio + impostos + parcelas), semClassificar };
}