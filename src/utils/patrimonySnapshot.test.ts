import { describe, it, expect } from "vitest";
import { compareSnapshot, SnapshotDetail } from "./patrimonySnapshot";

const cur: SnapshotDetail = { version: 1, groups: { "Veículos": 1200 }, cash: 500, receivables: 300, stock: 0, loans: 200, payables: 100, gross: 2000, net: 1700 };

describe("compareSnapshot", () => {
  it("foto antiga sem detalhe compara só bruto, dívida e líquido", () => {
    const r = compareSnapshot(cur, { month: "10/2026", gross_patrimony: 1000, total_debt: 400, net_equity_per_partner: 150, detail: null }, 4);
    expect(r.hasDetail).toBe(false);
    const by = Object.fromEntries(r.lines.map(l => [l.key, l]));
    expect(by["Veículos"].past).toBeNull();
    expect(by.gross.diff).toBe(1000);
    expect(by.gross.pct).toBe(100);
    expect(by.debt.past).toBe(400);
    expect(by.net.past).toBe(600);
  });
  it("foto detalhada compara cada grupo", () => {
    const r = compareSnapshot(cur, { month: "11/2026", gross_patrimony: 1800, total_debt: 300, net_equity_per_partner: 375, detail: { ...cur, groups: { "Veículos": 1000 }, gross: 1800, net: 1500 } }, 4);
    const v = r.lines.find(l => l.key === "Veículos")!;
    expect(v.diff).toBe(200);
    expect(v.pct).toBe(20);
  });
});
