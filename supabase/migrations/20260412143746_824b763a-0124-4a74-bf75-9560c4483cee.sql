-- Fix RLS SELECT policies and make the invoices bucket private

-- transactions
DROP POLICY IF EXISTS "Authenticated can view transactions" ON public.transactions;
CREATE POLICY "Users with role can view transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role) OR has_role(auth.uid(), 'lancamentos'::app_role));

-- app_config
DROP POLICY IF EXISTS "Authenticated can view config" ON public.app_config;
CREATE POLICY "Users with role can view config"
  ON public.app_config FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role) OR has_role(auth.uid(), 'lancamentos'::app_role) OR has_role(auth.uid(), 'nf_control'::app_role));

-- assets
DROP POLICY IF EXISTS "Authenticated can view assets" ON public.assets;
CREATE POLICY "Admin and gerencia can view assets"
  ON public.assets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role));

-- receivables
DROP POLICY IF EXISTS "Authenticated can view receivables" ON public.receivables;
CREATE POLICY "Admin and gerencia can view receivables"
  ON public.receivables FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role));

-- doubtful_credits
DROP POLICY IF EXISTS "Authenticated can view doubtful_credits" ON public.doubtful_credits;
CREATE POLICY "Admin and gerencia can view doubtful_credits"
  ON public.doubtful_credits FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role));

-- cash_entries
DROP POLICY IF EXISTS "Authenticated can view cash_entries" ON public.cash_entries;
CREATE POLICY "Admin and gerencia can view cash_entries"
  ON public.cash_entries FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role));

-- loans
DROP POLICY IF EXISTS "Authenticated can view loans" ON public.loans;
CREATE POLICY "Admin and gerencia can view loans"
  ON public.loans FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role));

-- payables
DROP POLICY IF EXISTS "Authenticated can view payables" ON public.payables;
CREATE POLICY "Admin and gerencia can view payables"
  ON public.payables FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role));

-- patrimony_snapshots
DROP POLICY IF EXISTS "Authenticated can view snapshots" ON public.patrimony_snapshots;
CREATE POLICY "Admin and gerencia can view snapshots"
  ON public.patrimony_snapshots FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role));

-- auto_transactions
DROP POLICY IF EXISTS "Authenticated can view auto_transactions" ON public.auto_transactions;
CREATE POLICY "Admin and gerencia can view auto_transactions"
  ON public.auto_transactions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role));

-- invoice_types
DROP POLICY IF EXISTS "Authenticated users can view invoice types" ON public.invoice_types;
CREATE POLICY "Users with role can view invoice types"
  ON public.invoice_types FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role) OR has_role(auth.uid(), 'nf_control'::app_role));

-- invoices
DROP POLICY IF EXISTS "Authenticated can view invoices" ON public.invoices;
CREATE POLICY "Admin, gerencia and nf_control can view invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role) OR has_role(auth.uid(), 'nf_control'::app_role));

-- Storage: make invoices bucket private
UPDATE storage.buckets SET public = false WHERE id = 'invoices';

DROP POLICY IF EXISTS "Authenticated can view invoice files" ON storage.objects;
CREATE POLICY "Admin, gerencia and nf_control can view invoice files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoices' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role) OR has_role(auth.uid(), 'nf_control'::app_role)));