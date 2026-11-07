import { describe, expect, it } from "vitest";
import { dataConferencia, saldoDigitado } from "./conferenciaMensal";
describe("Conferência mensal", () => {
  it("uses month-end for completed months and today for current month", () => {
    expect(dataConferencia("2026-10", "2026-11-07")).toBe("2026-10-31");
    expect(dataConferencia("2026-11", "2026-11-07")).toBe("2026-11-07");
  });
  it("rejects missing or invalid balances instead of silently treating them as zero", () => {
    expect(saldoDigitado("")).toBeNull();
    expect(saldoDigitado("1,2,3")).toBeNull();
    expect(saldoDigitado("0,00")).toBe(0);
    expect(saldoDigitado("R$ 1.234,56")).toBe(1234.56);
    expect(saldoDigitado("-123,45")).toBe(-123.45);
  });
});