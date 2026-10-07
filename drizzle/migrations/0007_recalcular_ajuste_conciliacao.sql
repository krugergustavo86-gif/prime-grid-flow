ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS absorvido_conciliacao boolean NOT NULL DEFAULT false;
UPDATE public.transactions SET absorvido_conciliacao = true WHERE description = 'GMS MINIMERCADO LTDA' AND date = '2026-10-05' AND value = 20000;

CREATE OR REPLACE FUNCTION public.lancamentos_pos_conciliacao()
RETURNS TABLE(id uuid, date date, description text, type text, value numeric, ajuste_id uuid, conc_data date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH c AS (SELECT data, ajuste_transaction_id, min(created_at) criado FROM conciliacoes
             WHERE ajuste_transaction_id IS NOT NULL GROUP BY data, ajuste_transaction_id ORDER BY data DESC LIMIT 1)
  SELECT t.id, t.date, t.description, t.type, t.value, c.ajuste_transaction_id, c.data
  FROM transactions t, c
  WHERE t.date <= c.data AND t.created_at > c.criado AND NOT t.absorvido_conciliacao
    AND t.category <> 'Ajuste de conciliação'
    AND NOT EXISTS (SELECT 1 FROM fechamentos_mensais f WHERE f.month = t.month)
$$;

CREATE OR REPLACE FUNCTION public.recalcular_ajuste_conciliacao()
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_aj uuid; v_net numeric; v_old numeric; v_new numeric; v_ids uuid[];
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'lancamentos')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT max(ajuste_id::text)::uuid, coalesce(sum(CASE WHEN type='Entrada' THEN value ELSE -value END),0), array_agg(id)
    INTO v_aj, v_net, v_ids FROM lancamentos_pos_conciliacao();
  IF v_aj IS NULL THEN RETURN 0; END IF;
  SELECT CASE WHEN type='Entrada' THEN value ELSE -value END INTO v_old FROM transactions WHERE id = v_aj;
  v_new := round(v_old - v_net, 2);
  UPDATE transactions SET type = CASE WHEN v_new >= 0 THEN 'Entrada' ELSE 'Saída' END, value = abs(v_new),
    notes = coalesce(notes,'') || ' · recalculado em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')
  WHERE id = v_aj;
  UPDATE transactions SET absorvido_conciliacao = true WHERE id = ANY(v_ids);
  RETURN v_new;
END $$;
GRANT EXECUTE ON FUNCTION public.lancamentos_pos_conciliacao() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_ajuste_conciliacao() TO authenticated;