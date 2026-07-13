GRANT INSERT ON public.transactions TO anon;
CREATE POLICY allow_anon_insert ON public.transactions FOR INSERT TO anon WITH CHECK (true);