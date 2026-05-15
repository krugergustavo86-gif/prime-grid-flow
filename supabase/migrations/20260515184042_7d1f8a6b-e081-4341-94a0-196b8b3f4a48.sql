DO $$
DECLARE
  v_count integer;
BEGIN
  WITH dups AS (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(trim(description)), value, date ORDER BY created_at, id) AS rn
      FROM public.transactions
      WHERE lower(description) NOT LIKE '%crt%'
        AND lower(description) NOT LIKE '%essor%'
    ) sub WHERE rn > 1
  ), deleted AS (
    DELETE FROM public.transactions WHERE id IN (SELECT id FROM dups) RETURNING id
  )
  SELECT count(*) INTO v_count FROM deleted;

  RAISE NOTICE 'Duplicatas removidas: %', v_count;

  INSERT INTO public.audit_log(action, entity, description, metadata)
  VALUES ('BULK_DELETE', 'transaction', 'Remoção em massa de duplicatas (excluindo CRT/Essor)',
    jsonb_build_object('removed_count', v_count));
END $$;