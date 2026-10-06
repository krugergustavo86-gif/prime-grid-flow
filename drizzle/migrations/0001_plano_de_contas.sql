ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS categoria_original text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS forma_pagamento text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS regra_aplicada text;
UPDATE public.transactions SET categoria_original = category WHERE categoria_original IS NULL;

CREATE OR REPLACE FUNCTION public.norm_txt(t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(translate(coalesce(t,''), 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc'))
$$;

CREATE TABLE public.regras_categoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto_contem text NOT NULL,
  modo text NOT NULL DEFAULT 'contem',
  tipo text NOT NULL,
  categoria_origem text,
  categoria text NOT NULL,
  forma_pagamento text,
  prioridade integer NOT NULL DEFAULT 100,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regras_categoria TO authenticated;
GRANT ALL ON public.regras_categoria TO service_role;
ALTER TABLE public.regras_categoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read regras" ON public.regras_categoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert regras" ON public.regras_categoria FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin update regras" ON public.regras_categoria FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete regras" ON public.regras_categoria FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));