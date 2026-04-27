-- Add 'contabilidade' role with read-only access to all financial data
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'contabilidade';