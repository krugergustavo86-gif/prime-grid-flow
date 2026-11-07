import { fimMes } from "./operacaoOS";
export function dataConferencia(mes: string, hoje: string) { return fimMes(mes) < hoje ? fimMes(mes) : hoje; }
export function saldoDigitado(texto: string): number | null {
  const s = texto.trim().replace(/R\$/g, "").replace(/\s/g, "");
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(s)) return null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}