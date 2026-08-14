DROP POLICY IF EXISTS "Authenticated can view pending boletos" ON public.pending_boletos;
DROP POLICY IF EXISTS "Authenticated can insert pending boletos" ON public.pending_boletos;
DROP POLICY IF EXISTS "Authenticated can update pending boletos" ON public.pending_boletos;
DROP POLICY IF EXISTS "Authenticated can delete pending boletos" ON public.pending_boletos;

CREATE POLICY "View pending boletos by role" ON public.pending_boletos FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerencia') OR has_role(auth.uid(), 'lancamentos') OR has_role(auth.uid(), 'contabilidade'));

CREATE POLICY "Insert pending boletos by role" ON public.pending_boletos FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lancamentos'));

CREATE POLICY "Update pending boletos by role" ON public.pending_boletos FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lancamentos'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lancamentos'));

CREATE POLICY "Delete pending boletos by role" ON public.pending_boletos FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));