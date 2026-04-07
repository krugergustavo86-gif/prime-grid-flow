import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

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
