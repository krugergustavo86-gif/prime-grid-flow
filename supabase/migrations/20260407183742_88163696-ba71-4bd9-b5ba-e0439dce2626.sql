-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'gerencia', 'lancamentos', 'nf_control');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Invoice types table
CREATE TABLE public.invoice_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view invoice types"
  ON public.invoice_types FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin and NF users can manage invoice types"
  ON public.invoice_types FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nf_control'));

-- Seed default invoice types
INSERT INTO public.invoice_types (name) VALUES
  ('Venda Gerador'),
  ('Kit Solar'),
  ('Serviço'),
  ('Manutenção');

-- Invoices (NF) table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL,
  type_id UUID REFERENCES public.invoice_types(id),
  type_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  value NUMERIC(15,2) NOT NULL CHECK (value > 0),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attachment_url TEXT,
  attachment_name TEXT,
  notes TEXT,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  month TEXT NOT NULL
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view invoices"
  ON public.invoices FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin and NF can insert invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nf_control'));

CREATE POLICY "Admin and NF can update invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nf_control'));

CREATE POLICY "Admin and NF can delete invoices"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nf_control'));

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for NF attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true);

CREATE POLICY "Authenticated can view invoice files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoices');

CREATE POLICY "Admin and NF can upload invoice files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nf_control')));

CREATE POLICY "Admin and NF can delete invoice files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'invoices' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nf_control')));