CREATE OR REPLACE FUNCTION public.wallet_cheque_for_maintenance(_id uuid, _expected_updated_at timestamptz) RETURNS public.cheques LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.cheques; r public.receivables;
BEGIN
 PERFORM public.cheque_admin();
 SELECT * INTO c FROM public.cheques WHERE id=_id FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Cheque não encontrado'; END IF;
 IF _expected_updated_at IS NULL OR c.updated_at IS DISTINCT FROM _expected_updated_at THEN RAISE EXCEPTION 'Cheque alterado por outro usuário; atualize a lista'; END IF;
 SELECT * INTO r FROM public.receivables WHERE id=c.receivable_id FOR UPDATE;
 IF c.status<>'Em carteira' OR c.account_id IS NOT NULL OR c.credited_transaction_id IS NOT NULL OR c.payable_id IS NOT NULL OR c.recipient IS NOT NULL OR c.supplier IS NOT NULL OR c.third_party_pending OR r.id IS NULL OR r.paid_value<>0 OR r.value<>c.value OR EXISTS(SELECT 1 FROM public.receivable_payments WHERE receivable_id=c.receivable_id) OR EXISTS(SELECT 1 FROM public.cheque_events WHERE cheque_id=c.id AND (from_status IS NOT NULL OR to_status<>'Em carteira' OR transaction_id IS NOT NULL OR payable_id IS NOT NULL)) THEN RAISE EXCEPTION 'Só é possível editar/excluir cheque Em carteira sem depósito, repasse ou movimento financeiro anterior'; END IF;
 PERFORM public.financial_open_date(c.received_date);
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.wallet_cheque_for_maintenance(uuid,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.edit_wallet_cheque(_id uuid,_expected_updated_at timestamptz,_data jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.cheques; legacy public.receivables; amount numeric:=round((_data->>'value')::numeric,2); received date:=(_data->>'received_date')::date; due date:=(_data->>'due_date')::date;
BEGIN
 c:=public.wallet_cheque_for_maintenance(_id,_expected_updated_at);
 IF amount IS NULL OR amount<=0 OR amount='NaN'::numeric OR received IS NULL OR due IS NULL OR due<received THEN RAISE EXCEPTION 'Valor e datas inválidos'; END IF;
 PERFORM public.financial_open_date(received);
 IF coalesce(trim(_data->>'number'),'')='' OR coalesce(trim(_data->>'bank'),'')='' OR coalesce(trim(_data->>'issuer'),'')='' OR coalesce(trim(_data->>'delivered_by'),'')='' THEN RAISE EXCEPTION 'Informe número, banco, emitente e quem entregou'; END IF;
 IF _data ? 'legacy_id' AND nullif(_data->>'legacy_id','')::uuid IS DISTINCT FROM c.legacy_id THEN RAISE EXCEPTION 'A origem do cheque não pode ser alterada'; END IF;
 PERFORM set_config('primegrid.cheque_internal','on',true);
 IF c.legacy_id IS NOT NULL THEN
  SELECT * INTO legacy FROM public.receivables WHERE id=c.legacy_id FOR UPDATE;
  IF legacy.id IS NULL OR NOT legacy.cheque_legacy OR legacy.value-legacy.paid_value+c.value<amount THEN RAISE EXCEPTION 'Valor excede o saldo legado disponível'; END IF;
  UPDATE public.receivables SET value=value+c.value-amount WHERE id=c.legacy_id;
 END IF;
 UPDATE public.cheques SET number=trim(_data->>'number'),bank=trim(_data->>'bank'),issuer=trim(_data->>'issuer'),delivered_by=trim(_data->>'delivered_by'),value=amount,received_date=received,due_date=due,notes=coalesce(_data->>'notes',''),updated_at=clock_timestamp() WHERE id=c.id;
 UPDATE public.receivables SET description='Cheque '||trim(_data->>'number')||' — '||trim(_data->>'delivered_by'),value=amount,due_date=to_char(due,'DD/MM/YYYY'),responsible=trim(_data->>'delivered_by'),notes=coalesce(_data->>'notes','') WHERE id=c.receivable_id;
 INSERT INTO public.cheque_events(id,cheque_id,to_status,event_date,reason,created_by,user_email) VALUES(gen_random_uuid(),c.id,'Em carteira',(now() AT TIME ZONE 'America/Sao_Paulo')::date,'Cadastro editado, sem movimento de caixa',auth.uid(),auth.email());
 INSERT INTO public.audit_log(id,user_id,user_email,action,entity,entity_id,description,metadata) VALUES(gen_random_uuid(),auth.uid(),auth.email(),'UPDATE','cheque',c.id,'Editou cadastro do cheque '||c.number,jsonb_build_object('before',to_jsonb(c),'after',_data,'legacy_delta',c.value-amount));
 PERFORM set_config('primegrid.cheque_internal','off',true);
END $$;

CREATE OR REPLACE FUNCTION public.delete_wallet_cheque(_id uuid,_expected_updated_at timestamptz,_reason text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.cheques; legacy public.receivables; history jsonb;
BEGIN
 c:=public.wallet_cheque_for_maintenance(_id,_expected_updated_at);
 IF coalesce(trim(_reason),'')='' THEN RAISE EXCEPTION 'Informe o motivo da exclusão'; END IF;
 PERFORM set_config('primegrid.cheque_internal','on',true);
 IF c.legacy_id IS NOT NULL THEN
  SELECT * INTO legacy FROM public.receivables WHERE id=c.legacy_id FOR UPDATE;
  IF legacy.id IS NULL OR NOT legacy.cheque_legacy THEN RAISE EXCEPTION 'Saldo legado não encontrado'; END IF;
  UPDATE public.receivables SET value=value+c.value WHERE id=c.legacy_id;
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) INTO history FROM public.cheque_events e WHERE cheque_id=c.id;
 INSERT INTO public.audit_log(id,user_id,user_email,action,entity,entity_id,description,metadata) VALUES(gen_random_uuid(),auth.uid(),auth.email(),'DELETE','cheque',c.id,'Excluiu cheque '||c.number||': '||trim(_reason),jsonb_build_object('before',to_jsonb(c),'events',history,'reason',trim(_reason),'legacy_restored',CASE WHEN c.legacy_id IS NULL THEN 0 ELSE c.value END));
 DELETE FROM public.cheque_events WHERE cheque_id=c.id;
 DELETE FROM public.cheques WHERE id=c.id;
 DELETE FROM public.receivables WHERE id=c.receivable_id;
 PERFORM set_config('primegrid.cheque_internal','off',true);
 RETURN c.photo_path;
END $$;
REVOKE ALL ON FUNCTION public.edit_wallet_cheque(uuid,timestamptz,jsonb), public.delete_wallet_cheque(uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edit_wallet_cheque(uuid,timestamptz,jsonb), public.delete_wallet_cheque(uuid,timestamptz,text) TO authenticated;