CREATE OR REPLACE FUNCTION public.aplicar_conciliacao(_data date, _saldos jsonb, _diferenca numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hist uuid; v_tx uuid; r record;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'lancamentos')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  SELECT id INTO v_hist FROM contas_bancarias WHERE historico LIMIT 1;
  IF abs(_diferenca) >= 0.005 THEN
    INSERT INTO transactions(date, description, type, category, value, notes, month, created_by, conta_id)
    VALUES (_data, 'Ajuste de conciliação ' || to_char(_data,'DD/MM/YYYY'),
      CASE WHEN _diferenca > 0 THEN 'Entrada' ELSE 'Saída' END,
      'Ajuste de conciliação', round(abs(_diferenca),2), 'Gerado pela tela Conciliação',
      to_char(_data,'MM/YYYY'), auth.uid(), v_hist)
    RETURNING id INTO v_tx;
  END IF;
  FOR r IN SELECT (e->>'conta_id')::uuid AS conta_id, (e->>'saldo_banco')::numeric AS saldo_banco, (e->>'saldo_sistema')::numeric AS saldo_sistema FROM jsonb_array_elements(_saldos) e LOOP
    INSERT INTO conciliacoes(conta_id, data, saldo_banco, saldo_sistema, diferenca, ajuste_transaction_id, created_by)
    VALUES (r.conta_id, _data, r.saldo_banco, r.saldo_sistema, round(r.saldo_banco - r.saldo_sistema, 2), v_tx, auth.uid());
    UPDATE contas_bancarias SET saldo_abertura = r.saldo_banco, data_abertura = _data WHERE id = r.conta_id AND NOT historico;
    INSERT INTO conciliacoes(conta_id, data, saldo_banco, saldo_sistema, diferenca, ajuste_transaction_id, created_by, created_at)
    VALUES (r.conta_id, _data, r.saldo_banco, r.saldo_banco, 0, v_tx, auth.uid(), now() + interval '1 second');
  END LOOP;
  RETURN v_tx;
END $$;