import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function fmtCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getCurrentMonth(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${m}/${y}`;
}

function getMonthLabel(month: string): string {
  const [m, y] = month.split("/");
  return `${MONTH_LABELS[parseInt(m) - 1]} ${y}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const month = getCurrentMonth();
    const [m, y] = month.split("/");
    const monthLabel = getMonthLabel(month);

    // Fetch all data in parallel
    const [configRes, transactionsRes, loansRes, snapshotsRes, invoicesRes] = await Promise.all([
      supabase.from("app_config").select("*").limit(1).single(),
      supabase.from("transactions").select("*").eq("month", month),
      supabase.from("loans").select("*"),
      supabase.from("patrimony_snapshots").select("*").order("month"),
      supabase.from("invoices").select("*").eq("month", month),
    ]);

    const config = configRes.data;
    const transactions = transactionsRes.data || [];
    const loans = loansRes.data || [];
    const snapshots = snapshotsRes.data || [];
    const invoices = invoicesRes.data || [];

    const numSocios = config?.num_socios || 4;

    // Calculate cash summary
    const entradas = transactions.filter((t: any) => t.type === "Entrada").reduce((s: number, t: any) => s + Number(t.value), 0);
    const saidas = transactions.filter((t: any) => t.type === "Saída").reduce((s: number, t: any) => s + Number(t.value), 0);
    const saldo = entradas - saidas;

    // Group expenses by category
    const catMap: Record<string, number> = {};
    transactions.filter((t: any) => t.type === "Saída").forEach((t: any) => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.value);
    });
    const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Loans summary
    const totalDebt = loans.reduce((s: number, l: any) => {
      const remaining = l.total_installments - l.paid_installments;
      return s + remaining * Number(l.installment_value);
    }, 0);
    const monthlyInstallments = loans.reduce((s: number, l: any) => s + Number(l.installment_value), 0);

    // Invoices summary
    const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.value), 0);
    const totalTax = invoices.reduce((s: number, i: any) => s + Number(i.value) * Number(i.tax_rate) / 100, 0);

    // Latest snapshot
    const currentSnapshot = snapshots.find((s: any) => s.month === month);
    const prevMonth = `${String(parseInt(m) - 1 || 12).padStart(2, "0")}/${parseInt(m) === 1 ? Number(y) - 1 : y}`;
    const prevSnapshot = snapshots.find((s: any) => s.month === prevMonth);

    // Generate PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const margin = 15;
    const contentW = W - margin * 2;
    let yPos = margin;

    function addPage() {
      doc.addPage();
      yPos = margin;
    }

    function checkSpace(needed: number) {
      if (yPos + needed > 280) addPage();
    }

    // Header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, W, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Mensal", margin, 18);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(monthLabel, margin, 28);
    doc.setFontSize(8);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, margin, 35);

    yPos = 50;
    doc.setTextColor(30, 41, 59);

    // Section helper
    function sectionTitle(title: string) {
      checkSpace(15);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, yPos, contentW, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(title, margin + 3, yPos + 6.5);
      yPos += 13;
    }

    function kpiRow(label: string, value: string, color?: [number, number, number]) {
      checkSpace(8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(label, margin + 3, yPos + 5);
      if (color) doc.setTextColor(...color);
      else doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(value, margin + contentW - 3, yPos + 5, { align: "right" });
      yPos += 8;
    }

    // 1. RESUMO DE CAIXA
    sectionTitle("1. Resumo de Caixa");
    kpiRow("Total de Entradas", fmtCurrency(entradas), [22, 163, 74]);
    kpiRow("Total de Saídas", fmtCurrency(saidas), [220, 38, 38]);
    kpiRow("Saldo do Mês", fmtCurrency(saldo), saldo >= 0 ? [22, 163, 74] : [220, 38, 38]);
    kpiRow("Nº de Lançamentos", String(transactions.length));
    yPos += 4;

    // Top categories
    if (topCats.length > 0) {
      checkSpace(10 + topCats.length * 7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("Principais Saídas por Categoria", margin + 3, yPos + 5);
      yPos += 9;

      topCats.forEach(([cat, val]) => {
        checkSpace(7);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(cat, margin + 6, yPos + 4);
        doc.setTextColor(30, 41, 59);
        doc.text(fmtCurrency(val), margin + contentW - 3, yPos + 4, { align: "right" });
        const pct = saidas > 0 ? (val / saidas * 100) : 0;
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.text(`${pct.toFixed(1)}%`, margin + contentW - 3, yPos + 8, { align: "right" });
        yPos += 9;
      });
    }
    yPos += 4;

    // 2. EVOLUÇÃO PATRIMONIAL
    sectionTitle("2. Evolução Patrimonial");
    if (currentSnapshot) {
      kpiRow("Patrimônio Bruto", fmtCurrency(Number(currentSnapshot.gross_patrimony)));
      kpiRow("Dívida Total", fmtCurrency(Number(currentSnapshot.total_debt)), [220, 38, 38]);
      const liq = Number(currentSnapshot.gross_patrimony) - Number(currentSnapshot.total_debt);
      kpiRow("Patrimônio Líquido", fmtCurrency(liq));
      kpiRow(`Líquido por Sócio (${numSocios})`, fmtCurrency(Number(currentSnapshot.net_equity_per_partner)));

      if (prevSnapshot) {
        const growth = Number(currentSnapshot.gross_patrimony) - Number(prevSnapshot.gross_patrimony);
        const pct = Number(prevSnapshot.gross_patrimony) > 0 ? (growth / Number(prevSnapshot.gross_patrimony) * 100) : 0;
        yPos += 2;
        kpiRow("Crescimento no Mês", `${growth >= 0 ? "+" : ""}${fmtCurrency(growth)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`, growth >= 0 ? [22, 163, 74] : [220, 38, 38]);
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Nenhum snapshot registrado para este mês.", margin + 3, yPos + 5);
      yPos += 10;
    }

    // Patrimony history table (last 6 months)
    const recentSnapshots = snapshots.slice(-6);
    if (recentSnapshots.length > 1) {
      yPos += 4;
      checkSpace(10 + recentSnapshots.length * 7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("Histórico Recente", margin + 3, yPos + 5);
      yPos += 9;

      // Table header
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, yPos, contentW, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Mês", margin + 3, yPos + 4);
      doc.text("Patrimônio", margin + 60, yPos + 4, { align: "right" });
      doc.text("Dívida", margin + 100, yPos + 4, { align: "right" });
      doc.text("Líq./Sócio", margin + contentW - 3, yPos + 4, { align: "right" });
      yPos += 7;

      recentSnapshots.forEach((s: any, i: number) => {
        checkSpace(7);
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, yPos, contentW, 6, "F");
        }
        const [sm, sy] = s.month.split("/");
        const shortLabel = `${MONTH_LABELS[parseInt(sm) - 1]?.substring(0, 3)}/${sy}`;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(shortLabel, margin + 3, yPos + 4);
        doc.text(fmtCurrency(Number(s.gross_patrimony)), margin + 60, yPos + 4, { align: "right" });
        doc.text(fmtCurrency(Number(s.total_debt)), margin + 100, yPos + 4, { align: "right" });
        doc.text(fmtCurrency(Number(s.net_equity_per_partner)), margin + contentW - 3, yPos + 4, { align: "right" });
        yPos += 7;
      });
    }
    yPos += 4;

    // 3. EMPRÉSTIMOS E DÍVIDAS
    sectionTitle("3. Empréstimos e Dívidas");
    kpiRow("Saldo Devedor Total", fmtCurrency(totalDebt), [220, 38, 38]);
    kpiRow("Parcelas Mensais", fmtCurrency(monthlyInstallments));
    kpiRow("Contratos Ativos", String(loans.length));
    yPos += 2;

    if (loans.length > 0) {
      checkSpace(8 + loans.length * 7);
      // Table header
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, yPos, contentW, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Contrato", margin + 3, yPos + 4);
      doc.text("Parcela", margin + 90, yPos + 4, { align: "right" });
      doc.text("Progresso", margin + 130, yPos + 4, { align: "right" });
      doc.text("Saldo", margin + contentW - 3, yPos + 4, { align: "right" });
      yPos += 7;

      loans.forEach((l: any, i: number) => {
        checkSpace(7);
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, yPos, contentW, 6, "F");
        }
        const remaining = l.total_installments - l.paid_installments;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const contractName = l.contract.length > 30 ? l.contract.substring(0, 30) + "..." : l.contract;
        doc.text(contractName, margin + 3, yPos + 4);
        doc.text(fmtCurrency(Number(l.installment_value)), margin + 90, yPos + 4, { align: "right" });
        doc.text(`${l.paid_installments}/${l.total_installments}`, margin + 130, yPos + 4, { align: "right" });
        doc.text(fmtCurrency(remaining * Number(l.installment_value)), margin + contentW - 3, yPos + 4, { align: "right" });
        yPos += 7;
      });
    }
    yPos += 4;

    // 4. NOTAS FISCAIS
    sectionTitle("4. Notas Fiscais");
    kpiRow("Total Faturado", fmtCurrency(totalInvoiced), [22, 163, 74]);
    kpiRow("Previsão de Impostos", fmtCurrency(totalTax), [220, 38, 38]);
    kpiRow("Líquido Estimado", fmtCurrency(totalInvoiced - totalTax));
    kpiRow("Notas Emitidas", String(invoices.length));
    yPos += 2;

    if (invoices.length > 0) {
      checkSpace(8 + Math.min(invoices.length, 15) * 7);
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, yPos, contentW, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Nº", margin + 3, yPos + 4);
      doc.text("Cliente", margin + 25, yPos + 4);
      doc.text("Valor", margin + 130, yPos + 4, { align: "right" });
      doc.text("Imposto", margin + contentW - 3, yPos + 4, { align: "right" });
      yPos += 7;

      invoices.slice(0, 15).forEach((inv: any, i: number) => {
        checkSpace(7);
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, yPos, contentW, 6, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(String(inv.number).substring(0, 10), margin + 3, yPos + 4);
        const clientName = inv.client_name.length > 35 ? inv.client_name.substring(0, 35) + "..." : inv.client_name;
        doc.text(clientName, margin + 25, yPos + 4);
        doc.text(fmtCurrency(Number(inv.value)), margin + 130, yPos + 4, { align: "right" });
        doc.text(fmtCurrency(Number(inv.value) * Number(inv.tax_rate) / 100), margin + contentW - 3, yPos + 4, { align: "right" });
        yPos += 7;
      });
      if (invoices.length > 15) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`... e mais ${invoices.length - 15} notas`, margin + 3, yPos + 4);
        yPos += 6;
      }
    }

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${p} de ${totalPages}`, W / 2, 293, { align: "center" });
      doc.line(margin, 289, W - margin, 289);
    }

    const pdfOutput = doc.output("arraybuffer");

    return new Response(pdfOutput, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-${month.replace("/", "-")}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Erro ao gerar relatório" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
