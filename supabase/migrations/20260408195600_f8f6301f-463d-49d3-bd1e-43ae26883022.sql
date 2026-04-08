CREATE TABLE public.patrimony_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL UNIQUE,
  gross_patrimony NUMERIC NOT NULL DEFAULT 0,
  total_debt NUMERIC NOT NULL DEFAULT 0,
  net_equity_per_partner NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patrimony_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view snapshots"
ON public.patrimony_snapshots
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage snapshots"
ON public.patrimony_snapshots
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_patrimony_snapshots_updated_at
BEFORE UPDATE ON public.patrimony_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();