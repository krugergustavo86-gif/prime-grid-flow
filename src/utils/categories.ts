export const CATEGORIAS_SAIDA = [
  "Materiais",
  "Custos Fixos",
  "Custo Operacional/Cartões",
  "Combustível",
  "Impostos/Contabilidade",
  "Reserva/Décimos/Férias",
  "Manutenções",
  "Investimentos",
  "Salários",
  "Perdas",
  "Marketing",
  "Solar Kits",
  "Comissões/Vendedores",
  "Geradores",
  "Centro Comercial",
  "Caminhões Padrões/Redes",
  "Empréstimos/Financiamentos",
] as const;

export const CATEGORIAS_ENTRADA = [
  "Energia Solar",
  "Lavagem/Suporte",
  "Predial",
  "Padrões/Redes/Caminhão",
  "Emergências/Socorro",
  "Quadros de Comando",
  "Geradores",
  "Prefeituras",
  "Outros",
] as const;

export function getCategoriesByType(type: "Saída" | "Entrada"): string[] {
  return type === "Saída" ? [...CATEGORIAS_SAIDA] : [...CATEGORIAS_ENTRADA];
}
