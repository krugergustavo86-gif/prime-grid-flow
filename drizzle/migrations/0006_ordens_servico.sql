CREATE TABLE public.ordens_servico (
  numero text PRIMARY KEY,
  cliente text,
  area text,
  status text,
  data_abertura date,
  data_execucao date,
  valor numeric,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  payload jsonb
);
GRANT SELECT ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem OS" ON public.ordens_servico FOR SELECT TO authenticated USING (true);