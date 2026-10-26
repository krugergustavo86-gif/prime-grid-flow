CREATE OR REPLACE FUNCTION public.baixar_cheque_legado(_value numeric, _date date, _account uuid, _category text, _notes text DEFAULT '')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_legacy uuid; v_cheque uuid; v_tx uuid;
BEGIN
  PERFORM public.cheque_admin();
  SELECT id INTO v_legacy FROM public.receivables
   WHERE cheque_legacy AND value - paid_value >= round(_value,2)
   ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF v_legacy IS NULL THEN RAISE EXCEPTION 'Valor excede o saldo legado de cheques'; END IF;
  v_cheque := public.create_cheque(jsonb_build_object(
    'number','LEG-' || upper(substr(gen_random_uuid()::text,1,8)),'bank','Legado','issuer','Saldo legado','delivered_by','Cheques até mes 12',
    'value',round(_value,2),'received_date',_date,'due_date',_date,
    'notes',concat('Baixa direta do saldo legado. ',coalesce(_notes,'')),
    'legacy_id',v_legacy::text));
  v_tx := public.cash_cheque(v_cheque, _date, jsonb_build_object(
    'account_id',_account::text,'create',true,'category',_category,'reason','Baixa do saldo legado'));
  RETURN v_tx;
END $function$;