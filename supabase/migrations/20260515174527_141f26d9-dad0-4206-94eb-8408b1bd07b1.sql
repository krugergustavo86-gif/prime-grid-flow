-- Audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);
CREATE INDEX idx_audit_log_action ON public.audit_log (action);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and gerencia can view audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerencia'::app_role));

CREATE POLICY "Authenticated can insert own audit_log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Trigger function to log transaction changes
CREATE OR REPLACE FUNCTION public.log_transaction_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_uid uuid := auth.uid();
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log(user_id, user_email, action, entity, entity_id, description, metadata)
    VALUES (v_uid, v_email, 'CREATE', 'transaction', NEW.id,
      'Criou lançamento: ' || NEW.description || ' (' || NEW.type || ' R$ ' || NEW.value || ')',
      jsonb_build_object('date', NEW.date, 'category', NEW.category, 'value', NEW.value, 'type', NEW.type));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log(user_id, user_email, action, entity, entity_id, description, metadata)
    VALUES (v_uid, v_email, 'UPDATE', 'transaction', NEW.id,
      'Editou lançamento: ' || NEW.description,
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW)));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log(user_id, user_email, action, entity, entity_id, description, metadata)
    VALUES (v_uid, v_email, 'DELETE', 'transaction', OLD.id,
      'Excluiu lançamento: ' || OLD.description || ' (' || OLD.type || ' R$ ' || OLD.value || ')',
      jsonb_build_object('date', OLD.date, 'category', OLD.category, 'value', OLD.value, 'type', OLD.type));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.log_transaction_change();