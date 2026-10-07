import { describe, expect, it } from "vitest";
import { skipsSimilarityWarning } from "./statementDuplicatePolicy";

describe("statement similarity exceptions", () => {
  it("preserves separate Help insurance debits", () => {
    expect(skipsSimilarityWarning("Saída", "Help")).toBe(true);
    expect(skipsSimilarityWarning("Saída", " HELP ")).toBe(true);
  });

  it("does not exempt credits or other descriptions", () => {
    expect(skipsSimilarityWarning("Entrada", "Help")).toBe(false);
    expect(skipsSimilarityWarning("Saída", "Help outro")).toBe(false);
    expect(skipsSimilarityWarning("Entrada", "GMS Minimercado")).toBe(false);
  });
});