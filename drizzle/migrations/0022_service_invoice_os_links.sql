CREATE TABLE public.service_invoice_os (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 invoice_id uuid NOT NULL REFERENCES public.service_invoices(id) ON DELETE CASCADE,
 os_number text NOT NULL REFERENCES public.ordens_servico(numero),
 created_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (invoice_id, os_number)
);
GRANT SELECT, INSERT, DELETE ON public.service_invoice_os TO authenticated;
GRANT ALL ON public.service_invoice_os TO service_role;
ALTER TABLE public.service_invoice_os ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_os_read ON public.service_invoice_os FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'contabilidade'));
CREATE POLICY service_os_insert ON public.service_invoice_os FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control'));
CREATE POLICY service_os_delete ON public.service_invoice_os FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control'));
INSERT INTO public.service_invoice_os (invoice_id, os_number, created_by)
 SELECT id, os_number, created_by FROM public.service_invoices WHERE os_number IS NOT NULL
 ON CONFLICT DO NOTHING;
COMMENT ON COLUMN public.service_invoices.os_number IS 'DEPRECATED: replaced by service_invoice_os (multiple OS per invoice)';