-- Add created_by column to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_transactions_created_by
  ON public.transactions(created_by);

-- Replace transactions RLS to support lancador
DROP POLICY IF EXISTS "Admin and lancamentos can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admin and lancamentos can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admin and lancamentos can delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users with role can view transactions" ON public.transactions;

CREATE POLICY "View transactions by role"
ON public.transactions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gerencia'::app_role)
  OR has_role(auth.uid(), 'lancamentos'::app_role)
  OR (has_role(auth.uid(), 'lancador'::app_role) AND created_by = auth.uid())
);

CREATE POLICY "Insert transactions by role"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lancamentos'::app_role)
  OR (has_role(auth.uid(), 'lancador'::app_role) AND created_by = auth.uid())
);

CREATE POLICY "Update transactions by role"
ON public.transactions FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lancamentos'::app_role)
  OR (has_role(auth.uid(), 'lancador'::app_role) AND created_by = auth.uid())
);

CREATE POLICY "Delete transactions by role"
ON public.transactions FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lancamentos'::app_role)
  OR (has_role(auth.uid(), 'lancador'::app_role) AND created_by = auth.uid())
);

-- Allow lancador to read app_config
DROP POLICY IF EXISTS "Users with role can view config" ON public.app_config;
CREATE POLICY "Users with role can view config"
ON public.app_config FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gerencia'::app_role)
  OR has_role(auth.uid(), 'lancamentos'::app_role)
  OR has_role(auth.uid(), 'nf_control'::app_role)
  OR has_role(auth.uid(), 'lancador'::app_role)
);