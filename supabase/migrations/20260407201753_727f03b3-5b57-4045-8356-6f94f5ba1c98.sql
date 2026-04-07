
-- Transactions table
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  description text NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  value numeric NOT NULL,
  notes text DEFAULT '',
  month text NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view transactions" ON public.transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and lancamentos can insert transactions" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lancamentos'));

CREATE POLICY "Admin and lancamentos can update transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lancamentos'));

CREATE POLICY "Admin and lancamentos can delete transactions" ON public.transactions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lancamentos'));

-- App config table (single row)
CREATE TABLE public.app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saldo_anterior numeric NOT NULL DEFAULT 409000,
  ano integer NOT NULL DEFAULT 2026,
  num_socios integer NOT NULL DEFAULT 4,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view config" ON public.app_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can update config" ON public.app_config
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Assets table
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_group text NOT NULL,
  description text NOT NULL,
  plate text,
  value_fipe numeric,
  value_market numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view assets" ON public.assets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage assets" ON public.assets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Receivables table
CREATE TABLE public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  value numeric NOT NULL,
  due_date text,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'A vencer',
  responsible text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view receivables" ON public.receivables
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage receivables" ON public.receivables
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Doubtful credits table
CREATE TABLE public.doubtful_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  value numeric NOT NULL,
  responsible text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doubtful_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view doubtful_credits" ON public.doubtful_credits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage doubtful_credits" ON public.doubtful_credits
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Cash entries table
CREATE TABLE public.cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  ref_date text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cash_entries" ON public.cash_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage cash_entries" ON public.cash_entries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Loans table
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract text NOT NULL,
  institution text NOT NULL DEFAULT '',
  type text NOT NULL,
  next_payment date,
  total_installments integer NOT NULL DEFAULT 0,
  paid_installments integer NOT NULL DEFAULT 0,
  installment_value numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view loans" ON public.loans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage loans" ON public.loans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Payables table
CREATE TABLE public.payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  value numeric NOT NULL,
  due_date text,
  responsible text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'A vencer',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view payables" ON public.payables
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage payables" ON public.payables
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default config
INSERT INTO public.app_config (saldo_anterior, ano, num_socios) VALUES (409000, 2026, 4);
