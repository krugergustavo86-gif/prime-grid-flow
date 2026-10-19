CREATE OR REPLACE FUNCTION public.cheque_return_category() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RETURN NEW; END $$;
COMMENT ON FUNCTION public.cheque_return_category() IS 'DEPRECATED: reversal category is set at creation by move_cheque; never reclassify an existing linked bank movement.';
CREATE OR REPLACE FUNCTION public.guard_cheque_supplier_debt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF coalesce(current_setting('primegrid.cheque_internal',true),'off')<>'on' AND EXISTS(SELECT 1 FROM public.cheques WHERE payable_id=OLD.id AND status IN ('Repassado','Compensado') OR payable_id=OLD.id AND third_party_pending) THEN RAISE EXCEPTION 'Dívida vinculada a cheque repassado; confira no controle de cheques'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;