import { normTxt } from "./categories";

/** Only exempts similarity warnings, never FITID/import-key reimport protection. */
export function skipsSimilarityWarning(type: string, description: string): boolean {
  return type === "Saída" && normTxt(description).trim() === "help";
}