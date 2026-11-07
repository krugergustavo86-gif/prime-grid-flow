import { describe, expect, it } from "vitest";
import { fimMes, resumoOS, OrdemServico } from "./operacaoOS";
const os = (numero: string, valor: number | null, extra: Partial<OrdemServico> = {}): OrdemServico => ({ numero, valor, cliente: numero, area: "Técnica", status: "Executada", data_abertura: "2026-09-01", data_execucao: "2026-10-01", ...extra });
describe("Operação OS simplificada", () => {
  it("keeps zero-value OS in executed counts but excludes them from the primary ticket", () => {
    const r = resumoOS([os("1", 100), os("2", 300), os("3", 0), os("4", null)], "2026-10", "Todas", "2026-11-07");
    expect(r.executadas).toHaveLength(4);
    expect(r.semValor).toHaveLength(2);
    expect(r.ticket).toBe(200);
    expect(r.ticketComZero).toBe(100);
    expect(r.valor).toBe(400);
  });
  it("shows no ticket when every OS has zero value", () => {
    expect(resumoOS([os("1", 0)], "2026-10").ticket).toBeNull();
  });
  it("filters cancellations and areas without deleting source rows", () => {
    const rows = [os("1", 100), os("2", 300, { area: "Geradores" }), os("3", 500, { status: "Cancelada" })];
    const before = structuredClone(rows);
    expect(resumoOS(rows, "2026-10", "Técnica").valor).toBe(100);
    expect(rows).toEqual(before);
  });
  it("uses actual month-end and counts backlog over thirty days", () => {
    expect(fimMes("2026-02")).toBe("2026-02-28");
    const r = resumoOS([os("1", 100, { data_abertura: "2026-01-01", data_execucao: "2026-03-01" }), os("2", 100, { data_abertura: "2026-03-01", data_execucao: null })], "2026-02", "Todas", "2026-11-07");
    expect(r.backlog).toHaveLength(1);
    expect(r.backlog30).toHaveLength(1);
  });
  it("does not count future execution in the current month", () => {
    expect(resumoOS([os("1", 100, { data_execucao: "2026-11-20" })], "2026-11", "Todas", "2026-11-07").executadas).toHaveLength(0);
  });
});