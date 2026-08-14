DROP POLICY IF EXISTS "allow_anon_insert" ON public.transactions;
REVOKE INSERT ON public.transactions FROM anon;