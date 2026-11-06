ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS ops_managed boolean NOT NULL DEFAULT false;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS ops_synced_at timestamptz;

CREATE TABLE public.ops_saldo_devedor_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id uuid NOT NULL REFERENCES public.receivables(id),
  tipo text NOT NULL CHECK (tipo IN ('manual_arquivado','atualizacao')),
  valor_anterior numeric NOT NULL,
  valor_novo numeric NOT NULL,
  referencia timestamptz,
  descricao_anterior text,
  notas_anteriores text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ops_saldo_devedor_historico TO authenticated;
GRANT ALL ON public.ops_saldo_devedor_historico TO service_role;
ALTER TABLE public.ops_saldo_devedor_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura histórico saldo OPS" ON public.ops_saldo_devedor_historico FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'contabilidade'));

CREATE OR REPLACE FUNCTION public.guard_managed_receivable()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 IF OLD.ops_managed AND coalesce(current_setting('primegrid.ops_internal',true),'off')<>'on' THEN
  RAISE EXCEPTION 'Este saldo é atualizado automaticamente pelo OPS e não pode ser editado';
 END IF;
 IF coalesce(current_setting('primegrid.cheque_internal',true),'off')='on' OR coalesce(current_setting('primegrid.ops_internal',true),'off')='on' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF OLD.cheque_legacy OR EXISTS(SELECT 1 FROM public.cheques WHERE receivable_id=OLD.id) THEN RAISE EXCEPTION 'Este saldo é gerenciado na aba Cheques'; END IF;
 IF EXISTS(SELECT 1 FROM public.receivable_payments WHERE receivable_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Recebível possui histórico de baixas'; END IF;
  IF NEW.paid_value<>OLD.paid_value OR NEW.status<>OLD.status OR NEW.value<OLD.paid_value THEN RAISE EXCEPTION 'Use as ações de baixa/desfazer para alterar o recebimento'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $function$;

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
   'Saldo devedor sistema OPS: R$ '||to_char(r.value,'FM999G999G990D00')||' → R$ '||to_char(novo,'FM999G999G990D00')||CASE WHEN arquivou THEN ' (valor manual arquivado)' ELSE '' END,
   jsonb_build_object('valor_anterior',r.value,'valor_novo',novo,'referencia',_referencia,'manual_arquivado',arquivou));
 END IF;
 RETURN jsonb_build_object('ignorado',false,'valor_anterior',r.value,'valor_novo',novo,'manual_arquivado',arquivou);
END $function$;
REVOKE ALL ON FUNCTION public.ops_set_saldo_devedor(numeric,timestamptz,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ops_set_saldo_devedor(numeric,timestamptz,jsonb) TO service_role;

UPDATE public.receivables SET description='Saldo devedor sistema OPS', ops_managed=true WHERE id='3cf1c708-4378-4071-aecd-26c2bd8cae44';