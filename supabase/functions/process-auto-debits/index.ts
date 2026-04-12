import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = new Set(["admin"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceKey;

    const authHeader = req.headers.get("Authorization");
    const cronSecretHeader = req.headers.get("x-cron-secret");
    const cronSecretEnv = Deno.env.get("CRON_SECRET");
    const isCronCall = !!cronSecretEnv && cronSecretHeader === cronSecretEnv;

    if (!isCronCall) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller } } = await anonClient.auth.getUser();
      if (!caller) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const adminCheckClient = createClient(supabaseUrl, serviceKey);
      const { data: roleRow } = await adminCheckClient
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .maybeSingle();
      if (!roleRow?.role || !ALLOWED_ROLES.has(roleRow.role)) {
        return new Response(
          JSON.stringify({ error: "Acesso restrito ao administrador" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Accept optional "catchup" mode with a lookback window
    let lookbackDays = 0;
    try {
      const body = await req.json();
      lookbackDays = body?.lookbackDays ?? 0;
    } catch { /* no body = daily cron */ }

    const today = new Date();
    const results: { generated: number; skipped: number; errors: string[] } = {
      generated: 0,
      skipped: 0,
      errors: [],
    };

    // Determine which days to process
    const datesToProcess: Date[] = [];
    for (let i = lookbackDays; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      datesToProcess.push(d);
    }

    // Fetch all loans with auto_debit enabled
    const { data: loans, error: loansErr } = await supabase
      .from("loans")
      .select("*")
      .eq("auto_debit", true);

    if (loansErr) throw loansErr;
    if (!loans?.length) {
      return new Response(JSON.stringify({ message: "No auto-debit loans found", ...results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const processDate of datesToProcess) {
      const dayOfMonth = processDate.getDate();
      const year = processDate.getFullYear();
      const monthNum = String(processDate.getMonth() + 1).padStart(2, "0");
      const monthKey = `${monthNum}/${year}`;
      const dateStr = processDate.toISOString().split("T")[0];

      for (const loan of loans) {
        // Check if this loan's debit day matches
        if (loan.debit_day !== dayOfMonth) continue;

        // Check date range
        if (loan.debit_start_date && dateStr < loan.debit_start_date) continue;
        if (loan.debit_end_date && dateStr > loan.debit_end_date) continue;

        // Check for existing auto_transaction this month (avoid duplicates)
        const { data: existing } = await supabase
          .from("auto_transactions")
          .select("id")
          .eq("loan_id", loan.id)
          .eq("month", monthKey)
          .eq("reversed", false)
          .limit(1);

        if (existing && existing.length > 0) {
          results.skipped++;
          continue;
        }

        // Create the transaction
        const description = `[Auto] ${loan.contract}${loan.bank_account ? ` - ${loan.bank_account}` : ""}`;
        const category = loan.debit_category || "Empréstimos/Financiamentos";

        const { data: txData, error: txErr } = await supabase
          .from("transactions")
          .insert({
            date: dateStr,
            description,
            type: "Saída",
            category,
            value: loan.installment_value,
            notes: `Débito automático - ${loan.institution || ""}`.trim(),
            month: monthKey,
            locked: false,
          })
          .select()
          .single();

        if (txErr) {
          results.errors.push(`Loan ${loan.contract}: ${txErr.message}`);
          continue;
        }

        // Record in auto_transactions
        const { error: atErr } = await supabase.from("auto_transactions").insert({
          loan_id: loan.id,
          transaction_id: txData.id,
          generated_date: dateStr,
          month: monthKey,
          value: loan.installment_value,
          description,
        });

        if (atErr) {
          results.errors.push(`Auto-track ${loan.contract}: ${atErr.message}`);
        } else {
          results.generated++;
        }
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
