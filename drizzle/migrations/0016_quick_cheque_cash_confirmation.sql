CREATE OR REPLACE FUNCTION public.cash_cheque(_id uuid, _date date, _data jsonb DEFAULT '{}'::jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.cheques; account uuid; tx uuid;
BEGIN
 PERFORM public.cheque_admin();
 SELECT * INTO c FROM public.cheques WHERE id=_id FOR UPDATE;
 IF c.id IS NULL OR c.status NOT IN ('Em carteira','Depositado') THEN RAISE EXCEPTION 'Só cheques em carteira ou depositados podem ser lançados no caixa'; END IF;
 account:=CASE WHEN c.status='Depositado' THEN c.account_id ELSE nullif(_data->>'account_id','')::uuid END;
 IF account IS NULL THEN RAISE EXCEPTION 'Selecione a conta'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(account::text||':'||c.value::text,0));
 IF coalesce((_data->>'create')::boolean,false) AND coalesce(trim(_data->>'category'),'')='' THEN RAISE EXCEPTION 'Selecione a categoria da entrada'; END IF;
 IF c.status='Em carteira' THEN PERFORM public.move_cheque(_id,'deposit',_date,jsonb_build_object('account_id',account,'reason','Depósito confirmado no lançamento rápido')); END IF;
 tx:=public.move_cheque(_id,'clear',_date,_data);
 RETURN tx;
END $$;
REVOKE ALL ON FUNCTION public.cash_cheque(uuid,date,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cash_cheque(uuid,date,jsonb) TO authenticated;
COMMENT ON FUNCTION public.cash_cheque(uuid,date,jsonb) IS 'Atomic quick cheque clearance: deposit and credit link/create succeed together; existing lifecycle owns reversal and audit.';