import { describe, expect, it } from "vitest";
import { custoInicioMes, PERIODO_INICIAL } from "./custoInicioMes";
import { Transaction } from "@/types";
const hoje = new Date(2026, 10, 7);
const tx = (category: string, value: number, date = "2026-10-01", type: Transaction["type"] = "Saída"): Transaction => ({ id: `${date}-${category}`, date, month: "01/2025", category, value, type, description: category });
describe("Custo de início de mês", () => {
  it("defaults to six complete months and excludes the current month", () => {
    expect(PERIODO_INICIAL).toBe(6);
    const result = custoInicioMes([tx("Combustível", 60, "2026-04-01"), tx("Combustível", 120, "2026-05-01"), tx("Combustível", 240), tx("Combustível", 900, "2026-11-01")], undefined, hoje);
    expect(result.meses).toEqual(["2026-05", "2026-10"]);
    expect(result.totalOperacional).toBe(180);
  });
  it("includes all three materials categories and historical aliases", () => {
    expect(custoInicioMes([tx("Materiais elétricos", 10), tx("Redes e Caminhão", 20), tx("Kits Solar/BESS", 30), tx("Geradores (peças e equipamentos)", 40)], 6, hoje).grupos[1].media).toBe(100);
  });
  it("includes all five payroll categories", () => {
    const names = ["Folha CLT", "Terceirizados", "Pró-labore sócios", "Encargos (FGTS/INSS)", "Provisão 13º/Férias"];
    expect(custoInicioMes(names.map((c, i) => tx(c, (i + 1) * 10)), 6, hoje).grupos[3].media).toBe(150);
  });
  it("keeps taxes and installments separate from others and excludes unrelated costs", () => {
    const rows = [tx("Marketing", 10), tx("Manutenção de frota e equipamentos", 20), tx("Despesas gerais", 30), tx("Impostos", 40), tx("Parcelas de empréstimos/financiamentos/consórcios", 50), tx("Juros e tarifas bancárias", 60), tx("Investimentos em patrimônio", 70), tx("Ajuste de conciliação", 80), tx("A classificar", 90), tx("Marketing", 999, "2026-10-01", "Entrada")];
    const before = structuredClone(rows);
    const result = custoInicioMes(rows, 6, hoje);
    expect(result.grupos[4].media).toBe(60);
    expect(result.totalOperacional).toBe(60);
    expect(result.impostos).toBe(40);
    expect(result.parcelas).toBe(50);
    expect(result.totalAmpliado).toBe(150);
    expect(result.semClassificar).toBe(90);
    expect(rows).toEqual(before);
  });
  it("uses all data months as divisor even when a group is absent", () => {
    expect(custoInicioMes([tx("Combustível", 100, "2026-09-01"), tx("Marketing", 20)], 3, hoje).grupos[2].media).toBe(50);
  });
  it("reports only ten months when twelve months of history are unavailable", () => {
    const rows = Array.from({ length: 10 }, (_, i) => tx("Combustível", 100, `2026-${String(i + 1).padStart(2, "0")}-01`));
    expect(custoInicioMes(rows, 12, hoje).meses).toHaveLength(10);
    expect(custoInicioMes(rows, 12, hoje).totalOperacional).toBe(100);
    expect(custoInicioMes([], 12, hoje).totalAmpliado).toBe(0);
  });
});