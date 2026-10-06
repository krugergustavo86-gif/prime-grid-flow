ALTER TABLE public.contas_bancarias
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'corrente',
  ADD COLUMN IF NOT EXISTS historico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saldo_abertura numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_abertura date;

UPDATE public.contas_bancarias SET tipo = 'investimento' WHERE nome = 'Sicredi Investimentos';
UPDATE public.contas_bancarias SET tipo = 'especie' WHERE nome = 'Dinheiro/Espécie';

INSERT INTO public.contas_bancarias (nome, banco, ativo, tipo, historico, created_at)
SELECT 'Histórico consolidado (antes da conciliação)', NULL, true, 'historico', true, '2000-01-01'
WHERE NOT EXISTS (SELECT 1 FROM public.contas_bancarias WHERE historico);

ALTER TABLE public.transactions DISABLE TRIGGER trg_audit_transactions;
UPDATE public.transactions SET conta_id = (SELECT id FROM public.contas_bancarias WHERE historico LIMIT 1) WHERE conta_id IS NULL;
ALTER TABLE public.transactions ENABLE TRIGGER trg_audit_transactions;

CREATE TABLE public.conciliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas_bancarias(id),
  data date NOT NULL,
  saldo_banco numeric NOT NULL,
  saldo_sistema numeric NOT NULL,
  diferenca numeric NOT NULL,
  ajuste_transaction_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.conciliacoes TO authenticated;
GRANT ALL ON public.conciliacoes TO service_role;
ALTER TABLE public.conciliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view conciliacoes" ON public.conciliacoes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'lancamentos') OR public.has_role(auth.uid(),'contabilidade'));
CREATE POLICY "insert conciliacoes" ON public.conciliacoes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lancamentos'));

CREATE TABLE public.fechamentos_mensais (
  month text PRIMARY KEY,
  fechado_em timestamptz NOT NULL DEFAULT now(),
  fechado_por uuid
);
GRANT SELECT ON public.fechamentos_mensais TO authenticated;
GRANT ALL ON public.fechamentos_mensais TO service_role;
ALTER TABLE public.fechamentos_mensais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read fechamentos" ON public.fechamentos_mensais FOR SELECT TO authenticated USING (true);
INSERT INTO public.fechamentos_mensais(month) VALUES ('01/2026'),('02/2026'),('03/2026') ON CONFLICT DO NOTHING;

-- Bloqueio de lançamentos em mês fechado
CREATE OR REPLACE FUNCTION public.block_closed_month()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND EXISTS (SELECT 1 FROM fechamentos_mensais WHERE month = OLD.month) THEN
    RAISE EXCEPTION 'Mês % está fechado', OLD.month;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND EXISTS (SELECT 1 FROM fechamentos_mensais WHERE month = NEW.month) THEN
    RAISE EXCEPTION 'Mês % está fechado', NEW.month;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_block_closed_month BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.block_closed_month();

-- Fecha mês: exige conciliação com diferença zero em todas as contas, datada no fim do mês ou depois
CREATE OR REPLACE FUNCTION public.fechar_mes(_month text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_end date := (to_date('01/' || _month, 'DD/MM/YYYY') + interval '1 month - 1 day')::date;
  v_bad int;
  v_email text;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'lancamentos')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  SELECT count(*) INTO v_bad FROM contas_bancarias c
  WHERE c.ativo AND NOT c.historico AND NOT EXISTS (
    SELECT 1 FROM (SELECT DISTINCT ON (conta_id) * FROM conciliacoes WHERE conta_id = c.id ORDER BY conta_id, data DESC, created_at DESC) l
    WHERE l.data >= v_end AND abs(l.diferenca) < 0.005);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'Mês só fecha com diferença zero na conciliação de todas as contas (data >= %)', to_char(v_end,'DD/MM/YYYY');
  END IF;
  INSERT INTO fechamentos_mensais(month, fechado_por) VALUES (_month, auth.uid()) ON CONFLICT DO NOTHING;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO audit_log(user_id, user_email, action, entity, description)
  VALUES (auth.uid(), v_email, 'CLOSE', 'month', 'Fechou o mês ' || _month);
END $$;

CREATE OR REPLACE FUNCTION public.reabrir_mes(_month text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Só Admin reabre mês'; END IF;
  DELETE FROM fechamentos_mensais WHERE month = _month;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO audit_log(user_id, user_email, action, entity, description)
  VALUES (auth.uid(), v_email, 'REOPEN', 'month', 'Reabriu o mês ' || _month);
END $$;

-- Ajuste de conciliação + rebase dos saldos de abertura (atômico)
CREATE OR REPLACE FUNCTION public.aplicar_conciliacao(_data date, _saldos jsonb, _diferenca numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hist uuid; v_tx uuid; r record; v_sys numeric;
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
    -- registro pós-ajuste: diferença zero
    INSERT INTO conciliacoes(conta_id, data, saldo_banco, saldo_sistema, diferenca, ajuste_transaction_id, created_by)
    VALUES (r.conta_id, _data, r.saldo_banco, r.saldo_banco, 0, v_tx, auth.uid());
  END LOOP;
  RETURN v_tx;
END $$;

GRANT EXECUTE ON FUNCTION public.fechar_mes(text), public.reabrir_mes(text), public.aplicar_conciliacao(date, jsonb, numeric) TO authenticated;