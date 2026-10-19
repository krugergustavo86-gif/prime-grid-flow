import type { Tables } from "@/integrations/supabase/types";

export type ServiceInvoice = Tables<"service_invoices">;
export type ServiceInvoiceDraft = Omit<ServiceInvoice, "id" | "created_at" | "updated_at" | "created_by">;
export interface ServiceReceipt { id: string; invoice_id: string; transaction_id: string; amount: number; date: string; description: string }
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function serviceInvoiceAmounts(i: Pick<ServiceInvoice, "gross_value" | "discounts" | "deductions" | "iss_base" | "iss_rate" | "iss_withheld" | "pis_rate" | "pis_withheld" | "cofins_rate" | "cofins_withheld" | "other_withholdings">) {
  const revenue = round(i.gross_value - i.discounts - i.deductions);
  const iss = round(i.iss_base * i.iss_rate / 100);
  const pis = round(revenue * i.pis_rate / 100);
  const cofins = round(revenue * i.cofins_rate / 100);
  const withheld = round((i.iss_withheld ? iss : 0) + (i.pis_withheld ? pis : 0) + (i.cofins_withheld ? cofins : 0) + i.other_withholdings);
  const tax = round(iss + pis + cofins + i.other_withholdings);
  return { revenue, iss, pis, cofins, withheld, tax, payableTax: round(tax - withheld), net: round(revenue - withheld) };
}

export function serviceMonthSummary(invoices: ServiceInvoice[], receipts: ServiceReceipt[], month: string) {
  const active = invoices.filter(i => i.status === "Emitida");
  const period = active.filter(i => i.competence.slice(0, 7) === month);
  const activeIds = new Set(active.map(i => i.id));
  const periodIds = new Set(period.map(i => i.id));
  const totals = period.reduce((s, i) => {
    const a = serviceInvoiceAmounts(i);
    return { gross: s.gross + i.gross_value, revenue: s.revenue + a.revenue, tax: s.tax + a.tax, withheld: s.withheld + a.withheld, payableTax: s.payableTax + a.payableTax, net: s.net + a.net, cost: s.cost + i.competence_cost };
  }, { gross: 0, revenue: 0, tax: 0, withheld: 0, payableTax: 0, net: 0, cost: 0 });
  const receivedInMonth = round(receipts.filter(r => activeIds.has(r.invoice_id) && r.date.slice(0, 7) === month).reduce((s, r) => s + r.amount, 0));
  const receivedForPeriod = round(receipts.filter(r => periodIds.has(r.invoice_id)).reduce((s, r) => s + r.amount, 0));
  const costsConfirmed = period.length > 0 && period.every(i => i.competence_cost_confirmed);
  const profit = costsConfirmed ? round(totals.revenue - totals.tax - totals.cost) : null;
  return { ...Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, round(v)])) as typeof totals, count: period.length, receivedInMonth, outstanding: round(totals.net - receivedForPeriod), costsConfirmed, profit, margin: profit !== null && totals.revenue > 0 ? profit / totals.revenue * 100 : null };
}

export function validateServiceDraft(i: ServiceInvoiceDraft): string | null {
  if (!i.number.trim() || !i.provider_name.trim() || !i.customer_name.trim() || !i.provider_document.trim() || !i.customer_document.trim() || !i.municipality.trim() || !i.service_description.trim() || !i.service_code.trim()) return "Preencha a identificação e o serviço";
  if (!i.issue_date || !/^\d{4}-\d{2}-01$/.test(i.competence)) return "Informe emissão e competência";
  const values = [i.gross_value, i.discounts, i.deductions, i.iss_base, i.iss_rate, i.pis_rate, i.cofins_rate, i.other_withholdings, i.competence_cost];
  if (values.some(v => !Number.isFinite(v) || v < 0) || [i.iss_rate, i.pis_rate, i.cofins_rate].some(v => v > 100)) return "Valores ou alíquotas inválidos";
  if (i.discounts + i.deductions > i.gross_value || i.iss_base > i.gross_value - i.discounts || serviceInvoiceAmounts(i).net < 0) return "Descontos, base ou retenções excedem o valor da nota";
  return null;
}

export function emptyServiceDraft(month: string): ServiceInvoiceDraft {
  return { number: "", provider_name: "", provider_document: "", customer_name: "", customer_document: "", municipality: "", service_code: "", service_description: "", issue_date: new Date().toISOString().slice(0, 10), competence: `${month}-01`, status: "Emitida", gross_value: 0, discounts: 0, deductions: 0, iss_base: 0, iss_rate: 0, iss_withheld: false, pis_rate: 0, cofins_rate: 0, pis_withheld: false, cofins_withheld: false, other_withholdings: 0, other_withholdings_notes: "", competence_cost: 0, competence_cost_confirmed: false, os_number: null, notes: "" };
}