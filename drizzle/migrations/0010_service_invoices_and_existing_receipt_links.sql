CREATE TABLE public.service_invoices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number text NOT NULL, provider_name text NOT NULL, provider_document text NOT NULL DEFAULT '', customer_name text NOT NULL, customer_document text NOT NULL DEFAULT '', municipality text NOT NULL DEFAULT '', service_code text NOT NULL DEFAULT '', service_description text NOT NULL DEFAULT '', issue_date date NOT NULL, competence date NOT NULL, status text NOT NULL DEFAULT 'Emitida' CHECK (status IN ('Emitida','Cancelada','Substituída')), gross_value numeric(14,2) NOT NULL DEFAULT 0 CHECK (gross_value >= 0), discounts numeric(14,2) NOT NULL DEFAULT 0 CHECK (discounts >= 0), deductions numeric(14,2) NOT NULL DEFAULT 0 CHECK (deductions >= 0), iss_base numeric(14,2) NOT NULL DEFAULT 0 CHECK (iss_base >= 0), iss_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK (iss_rate BETWEEN 0 AND 100), iss_withheld boolean NOT NULL DEFAULT false, pis_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK (pis_rate BETWEEN 0 AND 100), cofins_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK (cofins_rate BETWEEN 0 AND 100), pis_withheld boolean NOT NULL DEFAULT false, cofins_withheld boolean NOT NULL DEFAULT false, other_withholdings numeric(14,2) NOT NULL DEFAULT 0 CHECK (other_withholdings >= 0), other_withholdings_notes text NOT NULL DEFAULT '', competence_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (competence_cost >= 0), os_number text REFERENCES public.ordens_servico(numero), notes text NOT NULL DEFAULT '', created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (provider_document, provider_name, number), CHECK (discounts + deductions <= gross_value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_invoices TO authenticated;
GRANT ALL ON public.service_invoices TO service_role;
ALTER TABLE public.service_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_invoices_read ON public.service_invoices FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'contabilidade'));
CREATE POLICY service_invoices_manage ON public.service_invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control'));
CREATE TRIGGER service_invoices_updated BEFORE UPDATE ON public.service_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.service_invoice_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES public.service_invoices(id) ON DELETE CASCADE, transaction_id uuid NOT NULL REFERENCES public.transactions(id), amount numeric(14,2) NOT NULL CHECK(amount > 0), created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(invoice_id,transaction_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_invoice_receipts TO authenticated;
GRANT ALL ON public.service_invoice_receipts TO service_role;
ALTER TABLE public.service_invoice_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_receipts_read ON public.service_invoice_receipts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'contabilidade'));
CREATE POLICY service_receipts_manage ON public.service_invoice_receipts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control'));
CREATE TABLE public.service_invoice_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES public.service_invoices(id) ON DELETE CASCADE, name text NOT NULL, path text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_invoice_attachments TO authenticated;
GRANT ALL ON public.service_invoice_attachments TO service_role;
ALTER TABLE public.service_invoice_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_attachments_read ON public.service_invoice_attachments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'contabilidade'));
CREATE POLICY service_attachments_manage ON public.service_invoice_attachments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control'));
CREATE OR REPLACE FUNCTION public.service_invoice_net(i public.service_invoices) RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT i.gross_value-i.discounts-i.deductions-CASE WHEN i.iss_withheld THEN round(i.iss_base*i.iss_rate/100,2) ELSE 0 END-CASE WHEN i.pis_withheld THEN round((i.gross_value-i.discounts-i.deductions)*i.pis_rate/100,2) ELSE 0 END-CASE WHEN i.cofins_withheld THEN round((i.gross_value-i.discounts-i.deductions)*i.cofins_rate/100,2) ELSE 0 END-i.other_withholdings $$;
CREATE OR REPLACE FUNCTION public.validate_service_receipt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.transactions; i public.service_invoices; allocated numeric;
BEGIN
 SELECT * INTO i FROM public.service_invoices WHERE id=NEW.invoice_id FOR UPDATE;
 SELECT * INTO t FROM public.transactions WHERE id=NEW.transaction_id FOR UPDATE;
 IF t.id IS NULL OR t.type <> 'Entrada' THEN RAISE EXCEPTION 'Vincule somente um recebimento existente'; END IF;
 IF i.status <> 'Emitida' THEN RAISE EXCEPTION 'Nota cancelada ou substituída não recebe vínculos'; END IF;
 SELECT coalesce(sum(amount),0) INTO allocated FROM public.service_invoice_receipts WHERE transaction_id=NEW.transaction_id AND id<>NEW.id;
 IF allocated+NEW.amount>t.value THEN RAISE EXCEPTION 'Valor excede o saldo disponível do recebimento'; END IF;
 SELECT coalesce(sum(amount),0) INTO allocated FROM public.service_invoice_receipts WHERE invoice_id=NEW.invoice_id AND id<>NEW.id;
 IF allocated+NEW.amount>public.service_invoice_net(i) THEN RAISE EXCEPTION 'Valor excede o líquido a receber da nota'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER service_receipt_validate BEFORE INSERT OR UPDATE ON public.service_invoice_receipts FOR EACH ROW EXECUTE FUNCTION public.validate_service_receipt();
CREATE OR REPLACE FUNCTION public.validate_service_invoice_amounts() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF public.service_invoice_net(NEW)<0 THEN RAISE EXCEPTION 'Retenções excedem o valor disponível da nota'; END IF;
 IF NEW.iss_base>NEW.gross_value-NEW.discounts THEN RAISE EXCEPTION 'Base de ISS excede o valor após descontos'; END IF;
 IF EXISTS(SELECT 1 FROM public.service_invoice_receipts WHERE invoice_id=NEW.id) AND (NEW.status<>'Emitida' OR public.service_invoice_net(NEW)<(SELECT coalesce(sum(amount),0) FROM public.service_invoice_receipts WHERE invoice_id=NEW.id)) THEN RAISE EXCEPTION 'Desvincule recebimentos antes de cancelar ou reduzir o líquido abaixo do recebido'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER service_invoice_validate BEFORE INSERT OR UPDATE ON public.service_invoices FOR EACH ROW EXECUTE FUNCTION public.validate_service_invoice_amounts();
CREATE OR REPLACE FUNCTION public.search_service_receipts(_search text) RETURNS TABLE(id uuid,date date,description text,value numeric,available numeric) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'contabilidade')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 IF length(trim(_search))<2 THEN RETURN; END IF;
 RETURN QUERY SELECT t.id,t.date,t.description,t.value,t.value-coalesce((SELECT sum(r.amount) FROM public.service_invoice_receipts r WHERE r.transaction_id=t.id),0) FROM public.transactions t WHERE t.type='Entrada' AND (t.description ILIKE '%'||_search||'%' OR coalesce(t.notes,'') ILIKE '%'||_search||'%') ORDER BY t.date DESC,t.id DESC LIMIT 50;
END $$;
REVOKE ALL ON FUNCTION public.search_service_receipts(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.search_service_receipts(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.list_service_receipts() RETURNS TABLE(id uuid,invoice_id uuid,transaction_id uuid,amount numeric,date date,description text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nf_control') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'contabilidade')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 RETURN QUERY SELECT r.id,r.invoice_id,r.transaction_id,r.amount,t.date,t.description FROM public.service_invoice_receipts r JOIN public.transactions t ON t.id=r.transaction_id ORDER BY r.id;
END $$;
REVOKE ALL ON FUNCTION public.list_service_receipts() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_service_receipts() TO authenticated;
CREATE POLICY contabilidade_service_invoice_files ON storage.objects FOR SELECT TO authenticated USING (bucket_id='invoices' AND name LIKE 'nfse/%' AND public.has_role(auth.uid(),'contabilidade'));
CREATE INDEX service_invoices_competence_idx ON public.service_invoices(competence,id);
CREATE INDEX service_receipts_transaction_idx ON public.service_invoice_receipts(transaction_id);
COMMENT ON TABLE public.service_invoice_receipts IS 'Allocations of existing cash entries only; never generates transactions.';
COMMENT ON COLUMN public.service_invoices.competence_cost IS 'Explicitly attributed accrual costs; independent of cash-based operational margin.';