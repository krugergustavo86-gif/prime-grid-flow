CREATE TABLE public.custom_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Entrada','Saída')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_categories TO authenticated;
GRANT ALL ON public.custom_categories TO service_role;

ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view categories"
ON public.custom_categories FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gerencia'::app_role) OR has_role(auth.uid(),'lancamentos'::app_role) OR has_role(auth.uid(),'lancador'::app_role) OR has_role(auth.uid(),'contabilidade'::app_role) OR has_role(auth.uid(),'nf_control'::app_role));

CREATE POLICY "Lançamento roles can insert categories"
ON public.custom_categories FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'lancamentos'::app_role) OR has_role(auth.uid(),'lancador'::app_role));

CREATE POLICY "Admin can delete categories"
ON public.custom_categories FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'::app_role));