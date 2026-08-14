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

    const finalCategory = categoria && String(categoria).trim().length > 0
      ? String(categoria)
      : "Receita de Serviços";

    const notesParts: string[] = [];
    if (forma_pagamento) notesParts.push(`Forma: ${forma_pagamento}`);
    if (origem_os) notesParts.push(`OS: ${origem_os}`);
    const notes = notesParts.join(" | ");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, transaction: inserted }), {
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
