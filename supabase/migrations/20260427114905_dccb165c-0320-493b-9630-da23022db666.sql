-- Grant read-only access to 'contabilidade' role across all data tables

-- transactions
CREATE POLICY "Contabilidade can view transactions"
ON public.transactions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));

-- app_config (extend existing select policy via new policy)
CREATE POLICY "Contabilidade can view config"
ON public.app_config FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));

-- assets
CREATE POLICY "Contabilidade can view assets"
ON public.assets FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));

-- loans
CREATE POLICY "Contabilidade can view loans"
ON public.loans FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));

-- payables
CREATE POLICY "Contabilidade can view payables"
ON public.payables FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));

-- receivables
CREATE POLICY "Contabilidade can view receivables"
ON public.receivables FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));

-- auto_transactions
CREATE POLICY "Contabilidade can view auto_transactions"
ON public.auto_transactions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));

-- cash_entries
CREATE POLICY "Contabilidade can view cash_entries"
ON public.cash_entries FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));

-- doubtful_credits
CREATE POLICY "Contabilidade can view doubtful_credits"
ON public.doubtful_credits FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));

-- patrimony_snapshots
CREATE POLICY "Contabilidade can view snapshots"
ON public.patrimony_snapshots FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));

-- invoices
CREATE POLICY "Contabilidade can view invoices"
ON public.invoices FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));

-- invoice_types
CREATE POLICY "Contabilidade can view invoice types"
ON public.invoice_types FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'contabilidade'::app_role));