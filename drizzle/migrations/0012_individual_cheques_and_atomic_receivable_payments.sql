ALTER TABLE public.receivables ADD COLUMN cheque_legacy boolean NOT NULL DEFAULT false;
UPDATE public.receivables SET cheque_legacy=true WHERE id='78c4ff79-acf9-4fa0-b1ff-680062c57d26' AND description='Cheques até mes 12';
CREATE TABLE public.cheques (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), receivable_id uuid NOT NULL UNIQUE REFERENCES public.receivables(id), legacy_id uuid REFERENCES public.receivables(id),
 number text NOT NULL, bank text NOT NULL, issuer text NOT NULL, delivered_by text NOT NULL, value numeric(15,2) NOT NULL CHECK(value>0), received_date date NOT NULL, due_date date NOT NULL,
 notes text NOT NULL DEFAULT '', photo_path text, status text NOT NULL DEFAULT 'Em carteira' CHECK(status IN ('Em carteira','Depositado','Repassado','Compensado','Devolvido')),
 account_id uuid REFERENCES public.contas_bancarias(id), recipient text, supplier text, payable_id uuid REFERENCES public.payables(id), third_party_pending boolean NOT NULL DEFAULT false,
 credited_transaction_id uuid REFERENCES public.transactions(id), created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(bank,issuer,number)
);
GRANT SELECT ON public.cheques TO authenticated;
GRANT ALL ON public.cheques TO service_role;
ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;
CREATE POLICY cheques_read ON public.cheques FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'contabilidade'));
CREATE TABLE public.cheque_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cheque_id uuid NOT NULL REFERENCES public.cheques(id), from_status text, to_status text NOT NULL, event_date date NOT NULL, reason text NOT NULL DEFAULT '', recipient text, payable_id uuid REFERENCES public.payables(id), transaction_id uuid REFERENCES public.transactions(id), created_by uuid, user_email text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cheque_events TO authenticated;
GRANT ALL ON public.cheque_events TO service_role;
ALTER TABLE public.cheque_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY cheque_events_read ON public.cheque_events FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'contabilidade'));
CREATE TABLE public.receivable_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), receivable_id uuid NOT NULL REFERENCES public.receivables(id), transaction_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id), amount numeric(15,2) NOT NULL CHECK(amount>0), reversed boolean NOT NULL DEFAULT false, reversal_transaction_id uuid UNIQUE REFERENCES public.transactions(id), created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.receivable_payments TO authenticated;
GRANT ALL ON public.receivable_payments TO service_role;
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY receivable_payments_read ON public.receivable_payments FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'contabilidade'));
CREATE UNIQUE INDEX cheque_event_transaction_unique ON public.cheque_events(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX cheque_events_by_cheque ON public.cheque_events(cheque_id,event_date,created_at);
CREATE INDEX cheques_by_due_date ON public.cheques(due_date,id);
CREATE OR REPLACE FUNCTION public.cheque_admin() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Só Admin pode movimentar cheques e recebíveis'; END IF; END $$;
CREATE OR REPLACE FUNCTION public.financial_open_date(_date date) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF _date IS NULL OR _date>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Informe uma data válida, não futura'; END IF; IF EXISTS(SELECT 1 FROM public.fechamentos_mensais WHERE month=to_char(_date,'MM/YYYY')) THEN RAISE EXCEPTION 'Mês % está fechado',to_char(_date,'MM/YYYY'); END IF; END $$;
CREATE OR REPLACE FUNCTION public.link_financial_movement(_transaction uuid,_type text,_value numeric,_date date,_account uuid,_description text,_category text,_create boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.transactions; result uuid;
BEGIN
 PERFORM public.cheque_admin(); PERFORM public.financial_open_date(_date);
 IF _transaction IS NOT NULL THEN
  SELECT * INTO t FROM public.transactions WHERE id=_transaction FOR UPDATE;
  IF t.id IS NULL OR t.type<>_type OR t.value<>_value OR t.conta_id IS NULL THEN RAISE EXCEPTION 'Lançamento deve ter mesmo tipo, valor e conta'; END IF;
  IF _account IS NOT NULL AND t.conta_id<>_account THEN RAISE EXCEPTION 'Conta diferente da conta do cheque'; END IF;
  IF t.date<>_date THEN RAISE EXCEPTION 'Data deve corresponder ao lançamento vinculado'; END IF;
  PERFORM public.financial_open_date(t.date);
  IF EXISTS(SELECT 1 FROM public.cheque_events WHERE transaction_id=t.id) OR EXISTS(SELECT 1 FROM public.receivable_payments WHERE transaction_id=t.id OR reversal_transaction_id=t.id) THEN RAISE EXCEPTION 'Lançamento já vinculado a cheque ou baixa'; END IF;
  RETURN t.id;
 END IF;
 IF NOT _create THEN RAISE EXCEPTION 'Vincule um lançamento existente ou confirme a criação'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.contas_bancarias WHERE id=_account AND ativo AND NOT historico) THEN RAISE EXCEPTION 'Selecione uma conta ativa'; END IF;
 IF EXISTS(SELECT 1 FROM public.transactions WHERE type=_type AND value=_value AND conta_id=_account AND date BETWEEN _date-3 AND _date+3) THEN RAISE EXCEPTION 'Há movimento do mesmo valor nessa conta em até 3 dias; confira e vincule o existente'; END IF;
 result:=gen_random_uuid();
 INSERT INTO public.transactions(id,date,description,type,category,value,month,conta_id,forma_pagamento,created_by,notes) VALUES(result,_date,_description,_type,_category,_value,to_char(_date,'MM/YYYY'),_account,'Cheque',auth.uid(),'Movimento vinculado ao controle patrimonial');
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.link_financial_movement(uuid,text,numeric,date,uuid,text,text,boolean) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.create_cheque(_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=gen_random_uuid(); rid uuid:=gen_random_uuid(); lid uuid:=nullif(_data->>'legacy_id','')::uuid; amount numeric:=round((_data->>'value')::numeric,2); received date:=(_data->>'received_date')::date; due date:=(_data->>'due_date')::date; legacy public.receivables; email text;
BEGIN
 PERFORM public.cheque_admin();
 IF amount IS NULL OR amount<=0 OR received IS NULL OR due IS NULL OR due<received OR received>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Valor e datas inválidos'; END IF;
 IF coalesce(trim(_data->>'number'),'')='' OR coalesce(trim(_data->>'bank'),'')='' OR coalesce(trim(_data->>'issuer'),'')='' OR coalesce(trim(_data->>'delivered_by'),'')='' THEN RAISE EXCEPTION 'Informe número, banco, emitente e quem entregou'; END IF;
 PERFORM set_config('primegrid.cheque_internal','on',true);
 IF lid IS NOT NULL THEN
  SELECT * INTO legacy FROM public.receivables WHERE id=lid FOR UPDATE;
  IF legacy.id IS NULL OR NOT legacy.cheque_legacy OR legacy.value-legacy.paid_value<amount THEN RAISE EXCEPTION 'Valor excede o saldo legado a detalhar'; END IF;
  UPDATE public.receivables SET value=value-amount WHERE id=lid;
 END IF;
 INSERT INTO public.receivables(id,description,value,paid_value,type,status,due_date,responsible,notes) VALUES(rid,'Cheque '||trim(_data->>'number')||' — '||trim(_data->>'delivered_by'),amount,0,'Cheque','A vencer',to_char(due,'DD/MM/YYYY'),trim(_data->>'delivered_by'),coalesce(_data->>'notes',''));
 INSERT INTO public.cheques(id,receivable_id,legacy_id,number,bank,issuer,delivered_by,value,received_date,due_date,notes,created_by) VALUES(cid,rid,lid,trim(_data->>'number'),trim(_data->>'bank'),trim(_data->>'issuer'),trim(_data->>'delivered_by'),amount,received,due,coalesce(_data->>'notes',''),auth.uid());
 SELECT auth.email() INTO email;
 INSERT INTO public.cheque_events(cheque_id,to_status,event_date,reason,created_by,user_email) VALUES(cid,'Em carteira',received,CASE WHEN lid IS NULL THEN 'Cheque recebido' ELSE 'Individualizado do saldo legado' END,auth.uid(),email);
 INSERT INTO public.audit_log(user_id,user_email,action,entity,entity_id,description,metadata) VALUES(auth.uid(),email,'CREATE','cheque',cid,'Cadastrou cheque '||(_data->>'number'),jsonb_build_object('value',amount,'legacy_id',lid));
 PERFORM set_config('primegrid.cheque_internal','off',true); RETURN cid;
END $$;
CREATE OR REPLACE FUNCTION public.move_cheque(_id uuid,_action text,_date date,_data jsonb DEFAULT '{}'::jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.cheques; p public.payables; tx uuid; target text; account uuid; pid uuid; email text:=auth.email(); reason text:=coalesce(_data->>'reason',''); third boolean; last_date date;
BEGIN
 PERFORM public.cheque_admin(); SELECT * INTO c FROM public.cheques WHERE id=_id FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Cheque não encontrado'; END IF;
 SELECT max(event_date) INTO last_date FROM public.cheque_events WHERE cheque_id=c.id;
 IF _date IS NULL OR _date<last_date OR _date>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Data anterior ao último evento ou futura'; END IF;
 PERFORM public.financial_open_date(_date); PERFORM set_config('primegrid.cheque_internal','on',true);
 account:=coalesce(nullif(_data->>'account_id','')::uuid,c.account_id); third:=c.third_party_pending;
 IF _action='deposit' AND c.status='Em carteira' THEN
  IF NOT EXISTS(SELECT 1 FROM public.contas_bancarias WHERE id=account AND ativo AND NOT historico) THEN RAISE EXCEPTION 'Selecione a conta do depósito'; END IF;
  target:='Depositado';
 ELSIF _action='pass' AND c.status='Em carteira' THEN
  pid:=nullif(_data->>'payable_id','')::uuid; SELECT * INTO p FROM public.payables WHERE id=pid FOR UPDATE;
  IF coalesce(trim(_data->>'recipient'),'')='' OR coalesce(trim(_data->>'supplier'),'')='' OR p.id IS NULL OR p.status='Pago' OR p.value<c.value THEN RAISE EXCEPTION 'Informe destinatário, fornecedor e dívida pendente suficiente'; END IF;
  UPDATE public.payables SET value=CASE WHEN value=c.value THEN value ELSE value-c.value END,status=CASE WHEN value=c.value THEN 'Pago' ELSE status END WHERE id=p.id;
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
   tx:=public.link_financial_movement(nullif(_data->>'transaction_id','')::uuid,'Saída',c.value,_date,account,'Devolução cheque '||c.number||' — '||c.delivered_by,'Estorno de recebimento de cheque',coalesce((_data->>'create')::boolean,false));
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
CREATE OR REPLACE FUNCTION public.set_cheque_photo(_id uuid,_path text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.cheque_admin(); IF _path NOT LIKE _id::text||'/%' OR _path LIKE '%..%' THEN RAISE EXCEPTION 'Caminho de foto inválido'; END IF; UPDATE public.cheques SET photo_path=_path,updated_at=now() WHERE id=_id; END $$;
CREATE OR REPLACE FUNCTION public.pay_receivable(_id uuid,_amount numeric,_date date,_account uuid,_transaction uuid DEFAULT NULL,_create boolean DEFAULT false,_category text DEFAULT 'Recebimentos') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.receivables; tx uuid; result uuid:=gen_random_uuid(); amount numeric:=round(_amount,2);
BEGIN
 PERFORM public.cheque_admin(); SELECT * INTO r FROM public.receivables WHERE id=_id FOR UPDATE;
 IF r.id IS NULL OR r.cheque_legacy OR EXISTS(SELECT 1 FROM public.cheques WHERE receivable_id=r.id) THEN RAISE EXCEPTION 'Use o controle de cheques para este recebível'; END IF;
 IF amount IS NULL OR amount<=0 OR amount>r.value-r.paid_value THEN RAISE EXCEPTION 'Valor excede saldo ou é inválido'; END IF;
 tx:=public.link_financial_movement(_transaction,'Entrada',amount,_date,_account,'Recebimento - '||r.description,_category,_create);
 PERFORM set_config('primegrid.cheque_internal','on',true);
 UPDATE public.receivables SET paid_value=paid_value+amount,status=CASE WHEN paid_value+amount>=value THEN 'Recebido' ELSE status END WHERE id=r.id;
 INSERT INTO public.receivable_payments(id,receivable_id,transaction_id,amount,created_by) VALUES(result,r.id,tx,amount,auth.uid());
 INSERT INTO public.audit_log(user_id,user_email,action,entity,entity_id,description,metadata) VALUES(auth.uid(),auth.email(),'CREATE','receivable_payment',result,'Registrou baixa: '||r.description,jsonb_build_object('amount',amount,'transaction_id',tx));
 PERFORM set_config('primegrid.cheque_internal','off',true); RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.undo_receivable_payment(_id uuid,_date date,_transaction uuid DEFAULT NULL,_create boolean DEFAULT false,_reason text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.receivable_payments; r public.receivables; t public.transactions; tx uuid;
BEGIN
 PERFORM public.cheque_admin(); SELECT * INTO p FROM public.receivable_payments WHERE id=_id FOR UPDATE;
 IF p.id IS NULL OR p.reversed THEN RAISE EXCEPTION 'Baixa inexistente ou já desfeita'; END IF;
 SELECT * INTO r FROM public.receivables WHERE id=p.receivable_id FOR UPDATE;
 SELECT * INTO t FROM public.transactions WHERE id=p.transaction_id FOR UPDATE;
 PERFORM public.financial_open_date(t.date);
 IF _date<t.date OR trim(_reason)='' THEN RAISE EXCEPTION 'Informe motivo e data posterior ou igual à baixa'; END IF;
 IF r.paid_value<p.amount THEN RAISE EXCEPTION 'Saldo pago inconsistente; confira antes de desfazer'; END IF;
 IF EXISTS(SELECT 1 FROM public.service_invoice_receipts WHERE transaction_id=t.id) THEN RAISE EXCEPTION 'Desvincule o recebimento das notas fiscais antes de desfazer'; END IF;
 tx:=public.link_financial_movement(_transaction,'Saída',p.amount,_date,t.conta_id,'Estorno de recebimento - '||r.description,t.category,_create);
 PERFORM set_config('primegrid.cheque_internal','on',true);
 UPDATE public.receivables SET paid_value=paid_value-p.amount,status='A vencer' WHERE id=r.id;
 UPDATE public.receivable_payments SET reversed=true,reversal_transaction_id=tx WHERE id=p.id;
 INSERT INTO public.audit_log(user_id,user_email,action,entity,entity_id,description,metadata) VALUES(auth.uid(),auth.email(),'REVERSE','receivable_payment',p.id,'Desfez baixa: '||r.description||' — '||_reason,jsonb_build_object('amount',p.amount,'transaction_id',t.id,'reversal_transaction_id',tx));
 PERFORM set_config('primegrid.cheque_internal','off',true); RETURN tx;
END $$;
CREATE OR REPLACE FUNCTION public.guard_managed_receivable() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF coalesce(current_setting('primegrid.cheque_internal',true),'off')='on' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF OLD.cheque_legacy OR EXISTS(SELECT 1 FROM public.cheques WHERE receivable_id=OLD.id) THEN RAISE EXCEPTION 'Este saldo é gerenciado na aba Cheques'; END IF;
 IF EXISTS(SELECT 1 FROM public.receivable_payments WHERE receivable_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Recebível possui histórico de baixas'; END IF;
  IF NEW.paid_value<>OLD.paid_value OR NEW.status<>OLD.status OR NEW.value<OLD.paid_value THEN RAISE EXCEPTION 'Use as ações de baixa/desfazer para alterar o recebimento'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER managed_receivable_guard BEFORE UPDATE OR DELETE ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.guard_managed_receivable();
CREATE OR REPLACE FUNCTION public.guard_linked_financial_transaction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.cheque_events WHERE transaction_id=OLD.id) OR EXISTS(SELECT 1 FROM public.receivable_payments WHERE transaction_id=OLD.id OR reversal_transaction_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Movimento vinculado: faça a reversão pelo controle patrimonial'; END IF;
  IF (NEW.value,NEW.type,NEW.date,NEW.conta_id) IS DISTINCT FROM (OLD.value,OLD.type,OLD.date,OLD.conta_id) THEN RAISE EXCEPTION 'Movimento vinculado: valor, tipo, data e conta não podem ser alterados'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER linked_financial_transaction_guard BEFORE UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.guard_linked_financial_transaction();
REVOKE ALL ON FUNCTION public.cheque_admin(),public.financial_open_date(date),public.create_cheque(jsonb),public.move_cheque(uuid,text,date,jsonb),public.set_cheque_photo(uuid,text),public.pay_receivable(uuid,numeric,date,uuid,uuid,boolean,text),public.undo_receivable_payment(uuid,date,uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_cheque(jsonb),public.move_cheque(uuid,text,date,jsonb),public.set_cheque_photo(uuid,text),public.pay_receivable(uuid,numeric,date,uuid,uuid,boolean,text),public.undo_receivable_payment(uuid,date,uuid,boolean,text) TO authenticated;
