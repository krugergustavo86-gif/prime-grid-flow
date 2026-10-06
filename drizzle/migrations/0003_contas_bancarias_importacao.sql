CREATE TABLE public.contas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  banco text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_bancarias TO authenticated;
GRANT ALL ON public.contas_bancarias TO service_role;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read contas" ON public.contas_bancarias FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write contas" ON public.contas_bancarias FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS conta_id uuid REFERENCES public.contas_bancarias(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cliente text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fitid text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS import_key text;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_conta_fitid_uq ON public.transactions(conta_id, fitid) WHERE fitid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_import_key_uq ON public.transactions(import_key) WHERE import_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS transactions_category_idx ON public.transactions(category);