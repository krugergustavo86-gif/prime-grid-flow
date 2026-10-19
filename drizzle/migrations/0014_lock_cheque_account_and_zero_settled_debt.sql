CREATE OR REPLACE FUNCTION public.move_cheque(_id uuid,_action text,_date date,_data jsonb DEFAULT '{}'::jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE original_category text; c public.cheques; p public.payables; tx uuid; target text; account uuid; pid uuid; email text:=auth.email(); reason text:=coalesce(_data->>'reason',''); third boolean; last_date date;
BEGIN
 PERFORM public.cheque_admin(); SELECT * INTO c FROM public.cheques WHERE id=_id FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Cheque não encontrado'; END IF;
 SELECT max(event_date) INTO last_date FROM public.cheque_events WHERE cheque_id=c.id;
 IF _date IS NULL OR _date<last_date OR _date>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Data anterior ao último evento ou futura'; END IF;
 PERFORM public.financial_open_date(_date); PERFORM set_config('primegrid.cheque_internal','on',true);
 account:=CASE WHEN _action='deposit' THEN nullif(_data->>'account_id','')::uuid ELSE c.account_id END; third:=c.third_party_pending;
 IF _action='deposit' AND c.status='Em carteira' THEN
  IF NOT EXISTS(SELECT 1 FROM public.contas_bancarias WHERE id=account AND ativo AND NOT historico) THEN RAISE EXCEPTION 'Selecione a conta do depósito'; END IF;
  target:='Depositado';
 ELSIF _action='pass' AND c.status='Em carteira' THEN
  pid:=nullif(_data->>'payable_id','')::uuid; SELECT * INTO p FROM public.payables WHERE id=pid FOR UPDATE;
  IF coalesce(trim(_data->>'recipient'),'')='' OR coalesce(trim(_data->>'supplier'),'')='' OR p.id IS NULL OR p.status='Pago' OR p.value<c.value THEN RAISE EXCEPTION 'Informe destinatário, fornecedor e dívida pendente suficiente'; END IF;
  UPDATE public.payables SET value=value-c.value,status=CASE WHEN value=c.value THEN 'Pago' ELSE status END WHERE id=p.id;
  target:='Repassado'; third:=true;
 ELSIF _action='clear' AND c.status IN ('Depositado','Repassado') THEN
  target:='Compensado';
  IF c.status='Depositado' THEN
   tx:=public.link_financial_movement(nullif(_data->>'transaction_id','')::uuid,'Entrada',c.value,_date,account,'Compensação cheque '||c.number||' — '||c.delivered_by,coalesce(nullif(_data->>'category',''),'Recebimentos'),coalesce((_data->>'create')::boolean,false));
  END IF;
  third:=false;
 ELSIF _action='return' AND c.status IN ('Depositado','Repassado','Compensado') THEN
  IF trim(reason)='' THEN RAISE EXCEPTION 'Informe o motivo da devolução'; END IF;
  target:='Devolvido';
  IF c.credited_transaction_id IS NOT NULL THEN
   SELECT category INTO original_category FROM public.transactions WHERE id=c.credited_transaction_id;
   tx:=public.link_financial_movement(nullif(_data->>'transaction_id','')::uuid,'Saída',c.value,_date,account,'Devolução cheque '||c.number||' — '||c.delivered_by,original_category,coalesce((_data->>'create')::boolean,false));
   IF EXISTS(SELECT 1 FROM public.service_invoice_receipts WHERE transaction_id=c.credited_transaction_id) THEN RAISE EXCEPTION 'Desvincule o crédito das notas fiscais antes da devolução'; END IF;
  END IF;
  IF c.payable_id IS NOT NULL THEN
   IF NOT coalesce((_data->>'back_in_wallet')::boolean,false) THEN third:=true;
   ELSE
    SELECT * INTO p FROM public.payables WHERE id=c.payable_id FOR UPDATE;
    UPDATE public.payables SET value=CASE WHEN status='Pago' THEN c.value ELSE value+c.value END,status='A vencer' WHERE id=p.id; third:=false;
   END IF;
  END IF;
 ELSIF _action='recover' AND c.status='Devolvido' THEN
  IF c.third_party_pending THEN
   SELECT * INTO p FROM public.payables WHERE id=c.payable_id FOR UPDATE;
   UPDATE public.payables SET value=CASE WHEN status='Pago' THEN c.value ELSE value+c.value END,status='A vencer' WHERE id=p.id;
  END IF;
  target:='Em carteira'; third:=false; account:=NULL;
 ELSE RAISE EXCEPTION 'Mudança de situação inválida'; END IF;
 UPDATE public.cheques SET status=target,account_id=account,recipient=CASE WHEN _action='pass' THEN trim(_data->>'recipient') WHEN _action='recover' THEN NULL ELSE recipient END,supplier=CASE WHEN _action='pass' THEN trim(_data->>'supplier') WHEN _action='recover' THEN NULL ELSE supplier END,payable_id=CASE WHEN _action='pass' THEN pid WHEN _action='recover' THEN NULL ELSE payable_id END,third_party_pending=third,credited_transaction_id=CASE WHEN _action='clear' AND tx IS NOT NULL THEN tx WHEN _action IN ('return','recover') THEN NULL ELSE credited_transaction_id END,updated_at=now() WHERE id=c.id;
 UPDATE public.receivables SET paid_value=CASE WHEN target IN ('Repassado','Compensado') OR (target='Devolvido' AND third) THEN value ELSE 0 END,status=CASE WHEN target IN ('Repassado','Compensado') OR (target='Devolvido' AND third) THEN 'Recebido' ELSE 'A vencer' END WHERE id=c.receivable_id;
 INSERT INTO public.cheque_events(cheque_id,from_status,to_status,event_date,reason,recipient,payable_id,transaction_id,created_by,user_email) VALUES(c.id,c.status,target,_date,reason,CASE WHEN _action='pass' THEN trim(_data->>'recipient') ELSE c.recipient END,coalesce(pid,c.payable_id),tx,auth.uid(),email);
 INSERT INTO public.audit_log(user_id,user_email,action,entity,entity_id,description,metadata) VALUES(auth.uid(),email,'UPDATE','cheque',c.id,'Cheque '||c.number||': '||c.status||' → '||target,jsonb_build_object('date',_date,'reason',reason,'transaction_id',tx,'payable_id',coalesce(pid,c.payable_id)));
 PERFORM set_config('primegrid.cheque_internal','off',true); RETURN tx;
END $$;
