/** Approved expense consolidation; historical financial fields never change. */
export const EXPENSE_CATEGORY_ALIASES: Record<string, string> = {
  "Materiais elétricos": "Materiais gerais",
  "Redes e Caminhão": "Materiais gerais",
  "Comissões de vendas": "Comissões e taxas técnicas",
  "Taxas técnicas": "Comissões e taxas técnicas",
  "Custos fixos": "Despesas gerais",
  "Contabilidade": "Despesas gerais",
  "Centro Comercial": "Despesas gerais",
  "Custo operacional": "Despesas gerais",
  "Custo Operacional/Cartões": "Despesas gerais",
  "Perdas": "Despesas gerais",
  "Doações": "Marketing",
  "Impostos sobre faturamento": "Impostos",
  "Imóveis e terrenos": "Investimentos em patrimônio",
  "Veículos e máquinas": "Investimentos em patrimônio",
  "Equipamentos": "Investimentos em patrimônio",
};

export function canonicalCategory(type: string, category: string): string {
  return type === "Saída" ? EXPENSE_CATEGORY_ALIASES[category] ?? category : category;
}

export const SYSTEM_EXPENSE_CATEGORIES = ["Ajuste de implantação (planilha)", "Ajuste de conciliação"];
export const RETIRED_EXPENSE_CATEGORIES = ["Distribuição/retirada de sócios", "Retirada de socios", "Retirada de sócios", "Transferência entre contas", "Doações"];