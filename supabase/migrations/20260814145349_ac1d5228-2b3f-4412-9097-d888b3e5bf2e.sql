CREATE TABLE public.pending_boletos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  os_number text,
  client_name text,
  area text,
  value numeric NOT NULL,
  due_date date,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Receita de Serviços',
  notes text,
  status text NOT NULL DEFAULT 'pendente',
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_boletos TO authenticated;
GRANT ALL ON public.pending_boletos TO service_role;

ALTER TABLE public.pending_boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pending boletos" ON public.pending_boletos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert pending boletos" ON public.pending_boletos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update pending boletos" ON public.pending_boletos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete pending boletos" ON public.pending_boletos FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_pending_boletos_updated_at BEFORE UPDATE ON public.pending_boletos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pending_boletos_status ON public.pending_boletos(status);