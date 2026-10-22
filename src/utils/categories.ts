import { canonicalCategory, RETIRED_EXPENSE_CATEGORIES, SYSTEM_EXPENSE_CATEGORIES } from "../../supabase/functions/_shared/expenseCategories";
export { canonicalCategory } from "../../supabase/functions/_shared/expenseCategories";

/** Plano de contas: categoria pertence a um grupo. */
export interface CategoryGroup {
  tipo: "Entrada" | "Saída";
  grupo: string;
  /** false = fora da DRE e dos indicadores operacionais (mas conta no caixa). */
  operacional: boolean;
  categorias: string[];
}

export const PLANO_DE_CONTAS: CategoryGroup[] = [
  { tipo: "Entrada", grupo: "Receita operacional", operacional: true, categorias: [
    "Energia Solar/BESS", "Geradores", "Redes, Padrões e Caminhão", "Técnica", "Predial",
    "Emergência e Socorro", "Prefeituras", "Lavagem/Suporte", "Receita de Serviços",
  ] },
  { tipo: "Entrada", grupo: "Não operacional", operacional: false, categorias: [
    "Venda de ativo", "Empréstimo captado", "Aporte de sócio", "Transferência entre contas",
    "Estornos/Rendimentos", "Ajuste de implantação (planilha)", "Ajuste de conciliação",
  ] },
  { tipo: "Entrada", grupo: "A classificar", operacional: true, categorias: ["A classificar"] },
  { tipo: "Saída", grupo: "Custo direto", operacional: true, categorias: [
    "Kits Solar/BESS", "Materiais gerais", "Geradores (peças e equipamentos)", "Comissões e taxas técnicas",
  ] },
  { tipo: "Saída", grupo: "Pessoal (folha)", operacional: true, categorias: [
    "Pró-labore sócios", "Folha CLT", "Terceirizados", "Encargos (FGTS/INSS)", "Provisão 13º/Férias",
  ] },
  { tipo: "Saída", grupo: "Despesas operacionais", operacional: true, categorias: [
    "Combustível", "Manutenção de frota e equipamentos", "Despesas gerais", "Marketing",
  ] },
  { tipo: "Saída", grupo: "Impostos", operacional: true, categorias: ["Impostos"] },
  { tipo: "Saída", grupo: "Financeiro", operacional: true, categorias: [
    "Parcelas de empréstimos/financiamentos/consórcios", "Juros e tarifas bancárias",
  ] },
  { tipo: "Saída", grupo: "Investimentos/Patrimônio", operacional: false, categorias: [
    "Investimentos em patrimônio",
  ] },
  { tipo: "Saída", grupo: "A classificar", operacional: true, categorias: ["A classificar"] },
  { tipo: "Saída", grupo: "Não operacional", operacional: false, categorias: [
    "Distribuição/retirada de sócios", "Transferência entre contas",
    "Ajuste de implantação (planilha)", "Ajuste de conciliação",
  ] },
];

export const LOAN_CATEGORY = "Parcelas de empréstimos/financiamentos/consórcios";

export const FORMAS_PAGAMENTO = ["PIX", "Dinheiro", "Boleto", "Cartão", "Cheque", "Transferência"] as const;

export const CATEGORIAS_SAIDA = PLANO_DE_CONTAS.filter(g => g.tipo === "Saída").flatMap(g => g.categorias)
  .filter(c => !SYSTEM_EXPENSE_CATEGORIES.includes(c) && !RETIRED_EXPENSE_CATEGORIES.includes(c));
export const CATEGORIAS_ENTRADA = PLANO_DE_CONTAS.filter(g => g.tipo === "Entrada").flatMap(g => g.categorias);

/** Categorias fora da DRE/indicadores (grupos Não operacional e Investimentos). */
export const NON_OPERATIONAL_LIST = Array.from(new Set(
  PLANO_DE_CONTAS.filter(g => !g.operacional).flatMap(g => g.categorias),
));

export function groupOf(type: "Entrada" | "Saída", category: string): string {
  return PLANO_DE_CONTAS.find(g => g.tipo === type && g.categorias.includes(canonicalCategory(type, category)))?.grupo ?? "Outras";
}

/** Manual expense selection is restricted to the approved chart, including custom aliases. */
export function selectableCategories(type: "Entrada" | "Saída", custom: string[] = []): string[] {
  if (type === "Saída") return [...CATEGORIAS_SAIDA];
  return Array.from(new Set([...CATEGORIAS_ENTRADA, ...custom]));
}

export function getCategoriesByType(type: "Saída" | "Entrada"): string[] {
  return type === "Saída" ? [...CATEGORIAS_SAIDA] : [...CATEGORIAS_ENTRADA];
}

/** Texto normalizado (minúsculo, sem acento) para comparar regras. */
export function normTxt(s: string): string {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export const A_CLASSIFICAR = "A classificar";
