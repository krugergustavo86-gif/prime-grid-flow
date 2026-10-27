CREATE OR REPLACE FUNCTION public.edit_legacy_cheque_balance(_id uuid, _expected_balance numeric, _new_balance numeric, _reason text, _confirmed boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
DECLARE r public.receivables; previous_flag text;
BEGIN
 PERFORM public.cheque_admin();
 IF _confirmed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Confirme a correção do saldo legado'; END IF;
 IF _reason IS NULL OR length(trim(_reason))=0 THEN RAISE EXCEPTION 'Informe o motivo da correção'; END IF;
 IF _new_balance IS NULL OR _new_balance::text IN ('NaN','Infinity','-Infinity') OR _new_balance<0 OR _new_balance<>round(_new_balance,2) THEN RAISE EXCEPTION 'Informe um saldo não negativo com até duas casas decimais'; END IF;
 SELECT * INTO r FROM public.receivables WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR NOT r.cheque_legacy THEN RAISE EXCEPTION 'Saldo legado não encontrado'; END IF;
 IF _expected_balance IS NULL OR r.value-r.paid_value<>_expected_balance THEN RAISE EXCEPTION 'O saldo legado mudou; atualize a tela antes de corrigir'; END IF;
 IF _new_balance=r.value-r.paid_value THEN RAISE EXCEPTION 'Informe um saldo diferente do atual'; END IF;
 previous_flag:=coalesce(current_setting('primegrid.cheque_internal',true),'off');
 PERFORM set_config('primegrid.cheque_internal','on',true);
 UPDATE public.receivables SET value=r.paid_value+_new_balance WHERE id=r.id;
 PERFORM set_config('primegrid.cheque_internal',previous_flag,true);
 INSERT INTO public.audit_log(id,user_id,user_email,action,entity,entity_id,description,metadata)
 VALUES(gen_random_uuid(),auth.uid(),auth.jwt()->>'email','UPDATE','receivable',r.id,'Corrigiu saldo legado de cheques: '||trim(_reason),jsonb_build_object('operation','edit_legacy_cheque_balance','old_balance',r.value-r.paid_value,'new_balance',_new_balance,'reason',trim(_reason),'confirmed',true,'cash_unchanged',true));
END $function$;
REVOKE ALL ON FUNCTION public.edit_legacy_cheque_balance(uuid,numeric,numeric,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edit_legacy_cheque_balance(uuid,numeric,numeric,text,boolean) TO authenticated,service_role;