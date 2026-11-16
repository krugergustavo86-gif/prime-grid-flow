/** Detalhe guardado em cada foto mensal do patrimônio (patrimony_snapshots.detail). */
export interface SnapshotDetail {
  version: 1;
  groups: Record<string, number>; // Veículos, Imóveis/Terrenos, ...
  cash: number;
  receivables: number;
  stock: number;
  loans: number;
  payables: number;
  gross: number;
  net: number;
}

export interface SnapshotRow {
  month: string; // MM/YYYY
  gross_patrimony: number;
  total_debt: number;
  net_equity_per_partner: number;
  detail: SnapshotDetail | null;
}

export interface CompareLine { key: string; label: string; current: number; past: number | null; diff: number | null; pct: number | null; kind: "asset" | "debt" | "total" }

export const ASSET_GROUP_LABELS: [string, string][] = [
  ["Veículos", "Veículos"], ["Imóveis/Terrenos", "Imóveis e Terrenos"], ["Equipamentos", "Equipamentos"],
  ["Geradores Locados", "Geradores Locados"], ["Outros Ativos", "Outros Ativos"],
];

function line(key: string, label: string, current: number, past: number | null, kind: CompareLine["kind"]): CompareLine {
  const diff = past == null ? null : current - past;
  const pct = past == null || Math.abs(past) < 0.005 ? null : (diff! / Math.abs(past)) * 100;
  return { key, label, current, past, diff, pct, kind };
}

/** Compara posição atual com uma foto. Fotos sem detalhe comparam só bruto, dívida e líquido. */
export function compareSnapshot(current: SnapshotDetail, past: SnapshotRow, numSocios: number): { lines: CompareLine[]; hasDetail: boolean } {
  const d = past.detail;
  const pastNet = d ? d.net : past.gross_patrimony - past.total_debt;
  const lines: CompareLine[] = [];
  for (const [k, label] of ASSET_GROUP_LABELS) lines.push(line(k, label, current.groups[k] ?? 0, d ? d.groups[k] ?? 0 : null, "asset"));
  lines.push(line("cash", "Caixa e Investimentos", current.cash, d ? d.cash : null, "asset"));
  lines.push(line("receivables", "Contas a Receber", current.receivables, d ? d.receivables : null, "asset"));
  lines.push(line("stock", "Estoque Rotativo", current.stock, d ? d.stock : null, "asset"));
  lines.push(line("gross", "Patrimônio Bruto", current.gross, d ? d.gross : past.gross_patrimony, "total"));
  lines.push(line("loans", "Empréstimos", current.loans, d ? d.loans : null, "debt"));
  lines.push(line("payables", "Contas a Pagar", current.payables, d ? d.payables : null, "debt"));
  lines.push(line("debt", "Dívida total", current.loans + current.payables, d ? d.loans + d.payables : past.total_debt, "debt"));
  lines.push(line("net", "Patrimônio Líquido", current.net, pastNet, "total"));
  if (numSocios > 0) lines.push(line("perPartner", "Líquido por sócio", current.net / numSocios, d ? d.net / numSocios : past.net_equity_per_partner, "total"));
  return { lines, hasDetail: !!d };
}
