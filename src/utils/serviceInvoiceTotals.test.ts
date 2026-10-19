import { describe, expect, it } from "vitest";
import { emptyServiceDraft, serviceInvoiceAmounts, serviceMonthSummary, validateServiceDraft, type ServiceInvoice } from "./serviceInvoiceTotals";

const draft = { ...emptyServiceDraft("2026-10"), provider_name: "PRIMEGRID ENERGIA LTDA", service_description: "Aluguel de gerador 80kva", gross_value: 5000, iss_base: 5000, iss_rate: 3, iss_withheld: true };
const invoice: ServiceInvoice = { ...draft, id: "invoice", created_by: null, created_at: "2026-10-19", updated_at: "2026-10-19" };
describe("NFS-e: tributos, competência e caixa separados", () => {
  it("calcula ISSQN 3% de R$ 5.000 como R$ 150", () => { expect(serviceInvoiceAmounts(draft).iss).toBe(150); });
  it("retém R$ 150 e retorna líquido R$ 4.850 sem imposto a pagar novamente", () => {
    expect(serviceInvoiceAmounts(draft)).toMatchObject({ net: 4850, withheld: 150, payableTax: 0, tax: 150 });
  });
  it("ISS não retido não reduz recebível e fica a recolher", () => { expect(serviceInvoiceAmounts({ ...draft, iss_withheld: false })).toMatchObject({ net: 5000, payableTax: 150, withheld: 0 }); });
  it("separa recebimento em novembro do faturamento em outubro, inclusive parcial", () => {
    const receipts = [{ id: "receipt", invoice_id: "invoice", transaction_id: "tx", amount: 2000, date: "2026-11-01", description: "Recebimento" }];
    expect(serviceMonthSummary([invoice], receipts, "2026-10")).toMatchObject({ gross: 5000, receivedInMonth: 0, outstanding: 2850 });
    expect(serviceMonthSummary([invoice], receipts, "2026-11")).toMatchObject({ gross: 0, receivedInMonth: 2000 });
  });
  it("não apresenta margem fictícia sem custos confirmados", () => { expect(serviceMonthSummary([invoice], [], "2026-10").margin).toBeNull(); });
  it("margem por competência desconta imposto uma vez e custos atribuídos", () => {
    expect(serviceMonthSummary([{ ...invoice, competence_cost: 1000, competence_cost_confirmed: true }], [], "2026-10")).toMatchObject({ profit: 3850, margin: 77 });
  });
  it("exclui notas canceladas e substituídas da competência", () => { expect(serviceMonthSummary([{ ...invoice, status: "Cancelada" }, { ...invoice, id: "two", status: "Substituída" }], [], "2026-10").gross).toBe(0); });
  it("considera PIS/COFINS retidos e outras retenções sem dupla saída", () => {
    expect(serviceInvoiceAmounts({ ...draft, pis_rate: 0.65, cofins_rate: 3, pis_withheld: true, cofins_withheld: true, other_withholdings: 50 })).toMatchObject({ pis: 32.5, cofins: 150, net: 4617.5, payableTax: 0 });
  });
  it("rejeita retenções que tornam o líquido negativo", () => {
    const complete = { ...draft, number: "123", provider_document: "123", customer_name: "Cliente", customer_document: "456", municipality: "Município", service_code: "1", other_withholdings: 5000 };
    expect(validateServiceDraft(complete)).not.toBeNull();
  });
});