import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ROLES = new Set(["admin", "lancamentos"]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || serviceRoleKey

    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await anonClient.auth.getUser()

    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: roleRow } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle()

    if (!roleRow?.role || !ALLOWED_ROLES.has(roleRow.role)) {
      return new Response(JSON.stringify({ error: 'Sem permissão para importar lançamentos' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = adminClient

    const { transactions } = await req.json()
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return new Response(JSON.stringify({ error: 'No transactions provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Map to DB format
    const rows = transactions.map((t: any) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      type: t.type,
      category: t.category,
      value: t.value,
      notes: t.notes || '',
      month: t.month,
      locked: t.locked || false,
    }))

    // Upsert in batches of 200
    let inserted = 0
    const batchSize = 200
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const { error } = await supabase.from('transactions').upsert(batch, { onConflict: 'id' })
      if (error) {
        return new Response(JSON.stringify({ error: error.message, inserted }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      inserted += batch.length
    }

    return new Response(JSON.stringify({ success: true, inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
