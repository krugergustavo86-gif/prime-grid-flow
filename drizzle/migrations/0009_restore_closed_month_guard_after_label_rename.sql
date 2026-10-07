CREATE OR REPLACE FUNCTION public.block_closed_month() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND EXISTS (SELECT 1 FROM fechamentos_mensais WHERE month = OLD.month) THEN
    RAISE EXCEPTION 'Mês % está fechado', OLD.month;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND EXISTS (SELECT 1 FROM fechamentos_mensais WHERE month = NEW.month) THEN
    RAISE EXCEPTION 'Mês % está fechado', NEW.month;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $function$;