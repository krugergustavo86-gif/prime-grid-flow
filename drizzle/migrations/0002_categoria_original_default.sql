CREATE OR REPLACE FUNCTION public.set_categoria_original() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.categoria_original IS NULL THEN NEW.categoria_original := NEW.category; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_set_categoria_original BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_categoria_original();