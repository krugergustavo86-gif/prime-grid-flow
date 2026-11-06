CREATE OR REPLACE FUNCTION public.ops_set_saldo_devedor(_valor numeric, _referencia timestamptz, _payload jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.receivables; novo numeric := round(_valor,2); arquivou boolean := false;
BEGIN
 IF novo IS NULL OR novo < 0 OR novo::text IN ('NaN') THEN RAISE EXCEPTION 'valor inválido'; END IF;
 SELECT * INTO r FROM public.receivables WHERE ops_managed ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Linha de saldo devedor OPS não encontrada'; END IF;
 IF _referencia IS NOT NULL AND r.ops_synced_at IS NOT NULL AND _referencia < r.ops_synced_at THEN
  RETURN jsonb_build_object('ignorado',true,'motivo','envio mais antigo que o último aplicado','valor_atual',r.value);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.ops_saldo_devedor_historico WHERE receivable_id=r.id) THEN
  INSERT INTO public.ops_saldo_devedor_historico(receivable_id,tipo,valor_anterior,valor_novo,referencia,descricao_anterior,notas_anteriores,payload)
  VALUES (r.id,'manual_arquivado',r.value,novo,_referencia,r.description,r.notes,jsonb_build_object('paid_value',r.paid_value,'status',r.status,'due_date',r.due_date));
  arquivou := true;
 END IF;
 PERFORM set_config('primegrid.ops_internal','on',true);
 UPDATE public.receivables SET value=novo, paid_value=0, status='A vencer', ops_synced_at=coalesce(_referencia,now()),
   notes='Atualizado automaticamente pelo OPS (Financeiro, todos os anos, todas as áreas)' WHERE id=r.id;
 PERFORM set_config('primegrid.ops_internal','off',true);
 INSERT INTO public.ops_saldo_devedor_historico(receivable_id,tipo,valor_anterior,valor_novo,referencia,payload)
 VALUES (r.id,'atualizacao',r.value,novo,_referencia,_payload);
 IF r.value <> novo OR arquivou THEN
  INSERT INTO public.audit_log(user_id,user_email,action,entity,entity_id,description,metadata)
  VALUES (NULL,'OPS (integração)','UPDATE','receivable',r.id,
   'Saldo devedor sistema OPS: R$ '||translate(to_char(r.value,'FM999,999,990.00'),',.','.,')||' → R$ '||translate(to_char(novo,'FM999,999,990.00'),',.','.,')||CASE WHEN arquivou THEN ' (valor manual arquivado)' ELSE '' END,
   jsonb_build_object('valor_anterior',r.value,'valor_novo',novo,'referencia',_referencia,'manual_arquivado',arquivou));
 END IF;
 RETURN jsonb_build_object('ignorado',false,'valor_anterior',r.value,'valor_novo',novo,'manual_arquivado',arquivou);
END $function$;