
-- Add auto-debit fields to loans table
ALTER TABLE public.loans
  ADD COLUMN auto_debit boolean NOT NULL DEFAULT false,
  ADD COLUMN debit_day integer,
  ADD COLUMN debit_start_date date,
  ADD COLUMN debit_end_date date,
  ADD COLUMN bank_account text,
  ADD COLUMN debit_category text;

-- Create auto_transactions tracking table
CREATE TABLE public.auto_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  generated_date date NOT NULL,
  month text NOT NULL,
  value numeric NOT NULL,
  description text NOT NULL,
  reversed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin can manage auto_transactions"
  ON public.auto_transactions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view auto_transactions"
  ON public.auto_transactions FOR SELECT TO authenticated
  USING (true);

-- Index for fast duplicate checking
CREATE INDEX idx_auto_transactions_loan_month ON public.auto_transactions(loan_id, month) WHERE NOT reversed;
