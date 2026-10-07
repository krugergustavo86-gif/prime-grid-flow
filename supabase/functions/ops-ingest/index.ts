import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-integration-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = Deno.env.get("OPS_INTEGRATION_KEY");
    const provided = req.headers.get("x-integration-key");
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: "Invalid integration key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // Evento de OS (cadastro/status/conclusão) — não gera lançamento de caixa.
    if (body?.evento === "os" || body?.evento === "os_lote") {
      const lista = body.evento === "os_lote" ? (body.ordens ?? []) : [body];
      const AREAS: Record<string, string> = {
        "adm geral": "ADM Geral", "caminhao/redes": "Caminhão/Redes", "tecnica": "Técnica",
        "geradores": "Geradores", "emergencia": "Emergência", "solar/projetos": "Solar/Projetos",
      };
      const nrm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const okDate = (d: unknown) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null;
      const rows = [];
      for (const o of lista) {
        if (!o?.numero) continue;
        const a = o.area ? String(o.area) : null;
        rows.push({
          numero: String(o.numero), cliente: o.cliente ?? null,
          area: a ? (AREAS[nrm(a)] ?? a) : null, status: o.status ? String(o.status) : null,
          data_abertura: okDate(o.data_abertura), data_execucao: okDate(o.data_execucao),
          valor: Number.isFinite(Number(o.valor)) ? Number(o.valor) : null,
          atualizado_em: new Date().toISOString(), payload: o,
        });
      }
      if (!rows.length) {
        return new Response(JSON.stringify({ error: "nenhuma OS com numero" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { error: e } = await sb.from("ordens_servico").upsert(rows, { onConflict: "numero" });
      if (e) return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true, ordens: rows.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const {
      valor,
      tipo,
      descricao,
      data,
      categoria,
      origem_os,
      cliente,
      area,
      forma_pagamento,
      data_vencimento,
      pendente,
      status,
    } = body ?? {};



    const valueNum = Number(valor);
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      return new Response(JSON.stringify({ error: "valor inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!data || typeof data !== "string") {
      return new Response(JSON.stringify({ error: "data inválida (YYYY-MM-DD)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedType = String(tipo ?? "entrada").toLowerCase() === "saida" ||
      String(tipo ?? "entrada").toLowerCase() === "saída"
      ? "Saída"
      : "Entrada";

    const dateObj = new Date(data);
    if (isNaN(dateObj.getTime())) {
      return new Response(JSON.stringify({ error: "data não é uma data válida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const month = `${String(dateObj.getUTCMonth() + 1).padStart(2, "0")}/${dateObj.getUTCFullYear()}`;

    const descParts: string[] = ["[OPS]"];
    if (origem_os) descParts.push(`OS #${origem_os}`);
    if (cliente) descParts.push(`- ${cliente}`);
    if (area) descParts.push(`- ${area}`);
    const finalDescription = descricao && String(descricao).trim().length > 0
      ? String(descricao)
      : descParts.join(" ");

    // Plano de contas: categorias antigas/" - Boleto" viram a categoria-base
    const CATEGORY_MAP: Record<string, string> = {
      "Energia Solar": "Energia Solar/BESS",
      "Caminhão/Redes": "Redes, Padrões e Caminhão",
      "Padrões/Redes/Caminhão": "Redes, Padrões e Caminhão",
      "Emergências/Socorro": "Emergência e Socorro",
      "Outros": "A classificar",
      "Recebimentos": "A classificar",
    };
    const rawCategory = categoria && String(categoria).trim().length > 0
      ? String(categoria).replace(/\s*-\s*Boleto\s*$/i, "").trim()
      : "Receita de Serviços";
    const finalCategory = CATEGORY_MAP[rawCategory] ?? rawCategory;
    const fp = String(forma_pagamento ?? "").toLowerCase();
    const formaPagamento = fp.includes("pix") ? "PIX" : fp.includes("boleto") ? "Boleto"
      : fp.includes("dinheiro") ? "Dinheiro" : fp.includes("cart") ? "Cartão"
      : fp.includes("cheque") ? "Cheque" : (fp.includes("transf") || fp.includes("ted")) ? "Transferência" : null;

    const notesParts: string[] = [];
    if (forma_pagamento) notesParts.push(`Forma: ${forma_pagamento}`);
    if (origem_os) notesParts.push(`OS: ${origem_os}`);
    const notes = notesParts.join(" | ");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Boletos NÃO entram direto no fluxo: ficam pendentes até confirmação manual no Cash
    const isBoleto = String(forma_pagamento ?? "").toLowerCase().includes("boleto");
    const statusStr = String(status ?? "").toLowerCase();
    const isPending = statusStr === "pendente" || statusStr === "a_confirmar" ||
      pendente === true || (isBoleto && normalizedType === "Entrada");


    if (isPending) {
      const { data: pendingRow, error: pendingError } = await supabase
        .from("pending_boletos")
        .insert({
          os_number: origem_os ? String(origem_os) : null,
          client_name: cliente ? String(cliente) : null,
          area: area ? String(area) : null,
          value: valueNum,
          due_date: typeof data_vencimento === "string" && data_vencimento.length > 0 ? data_vencimento : data,
          entry_date: data,
          payment_method: forma_pagamento ? String(forma_pagamento) : null,
          description: finalDescription,
          category: finalCategory,
          notes,
          status: "pendente",
        })
        .select()
        .single();

      if (pendingError) {
        return new Response(JSON.stringify({ error: pendingError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, status: "pendente", pending_boleto: pendingRow }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: inserted, error } = await supabase
      .from("transactions")
      .insert({
        date: data,
        description: finalDescription,
        type: normalizedType,
        category: finalCategory,
        value: valueNum,
        notes,
        month,
        locked: false,
        forma_pagamento: formaPagamento,
        categoria_original: finalCategory,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, status: "confirmado", transaction: inserted }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
