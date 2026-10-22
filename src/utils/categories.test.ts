import { describe, expect, it } from "vitest";
import { canonicalCategory, getCategoriesByType, groupOf, selectableCategories } from "./categories";
import { computeMonthlyTotals, isOperational, sumTotals } from "./monthlyTotals";
import { custosPorMes } from "./custoOperacional";
import { Transaction } from "@/types";

const tx = (category: string, value: number): Transaction => ({ id: category, category, value, type: "Saída", date: "2026-09-01", month: "10/2026", description: category });

describe("Approved expense chart", () => {
  it("offers exactly the 18 approved categories", () => {
    expect(getCategoriesByType("Saída")).toEqual([
      "Kits Solar/BESS", "Materiais gerais", "Geradores (peças e equipamentos)", "Comissões e taxas técnicas",
      "Pró-labore sócios", "Folha CLT", "Terceirizados", "Encargos (FGTS/INSS)", "Provisão 13º/Férias",
      "Combustível", "Manutenção de frota e equipamentos", "Despesas gerais", "Marketing", "Impostos",
      "Parcelas de empréstimos/financiamentos/consórcios", "Juros e tarifas bancárias", "Investimentos em patrimônio", "A classificar",
    ]);
  });
  it.each(["Doações", "Transferência entre contas", "Distribuição/retirada de sócios", "Ajuste de implantação (planilha)", "Ajuste de conciliação"])("does not let custom options reintroduce %s", category => {
    expect(selectableCategories("Saída", [category])).not.toContain(category);
  });
  it.each(["Custos fixos", "Contabilidade", "Centro Comercial", "Custo operacional", "Perdas", "Despesas gerais"])("consolidates %s into Despesas gerais", category => {
    expect(canonicalCategory("Saída", category)).toBe("Despesas gerais");
  });
  it.each(["Materiais elétricos", "Redes e Caminhão"])("consolidates only materials %s", category => {
    expect(canonicalCategory("Saída", category)).toBe("Materiais gerais");
  });
  it.each(["Geradores (peças e equipamentos)", "Kits Solar/BESS", "Combustível", "Manutenção de frota e equipamentos", "Encargos (FGTS/INSS)", "Provisão 13º/Férias", "Folha CLT", "Terceirizados", "Pró-labore sócios"])("preserves %s separately", category => {
    expect(canonicalCategory("Saída", category)).toBe(category);
  });
  it("classifies historical donations as operational Marketing", () => {
    expect(canonicalCategory("Saída", "Doações")).toBe("Marketing");
    expect(groupOf("Saída", "Doações")).toBe("Despesas operacionais");
    expect(isOperational(tx("Doações", 250))).toBe(true);
    expect(custosPorMes([tx("Doações", 250)])["2026-09"].custoOp).toBe(250);
  });
  it("keeps historical transfers and withdrawals nonoperational and distinct from pro-labore", () => {
    for (const category of ["Transferência entre contas", "Distribuição/retirada de sócios"]) {
      expect(canonicalCategory("Saída", category)).toBe(category);
      expect(isOperational(tx(category, 10))).toBe(false);
    }
  });
  it("keeps old and new patrimonial categories outside operational costs", () => {
    for (const category of ["Imóveis e terrenos", "Veículos e máquinas", "Equipamentos", "Investimentos em patrimônio"]) expect(isOperational(tx(category, 10))).toBe(false);
  });
  it("sums all five personnel categories without changing cash or transaction dates/values", () => {
    const rows = [tx("Folha CLT", 100), tx("Terceirizados", 200), tx("Pró-labore sócios", 300), tx("Encargos (FGTS/INSS)", 400), tx("Provisão 13º/Férias", 500), tx("Materiais elétricos", 600)];
    const before = structuredClone(rows);
    expect(custosPorMes(rows)["2026-09"].pessoal).toBe(1500);
    expect(sumTotals(rows).balanco).toBe(-2100);
    expect(computeMonthlyTotals(rows)["2026-09"].byCategory["Saída|Materiais gerais"].value).toBe(600);
    expect(rows).toEqual(before);
  });
});