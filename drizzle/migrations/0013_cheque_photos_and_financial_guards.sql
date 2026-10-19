CREATE POLICY cheque_photo_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='cheque-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerencia') OR public.has_role(auth.uid(),'contabilidade')));
CREATE POLICY cheque_photo_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='cheque-photos' AND public.has_role(auth.uid(),'admin') AND EXISTS(SELECT 1 FROM public.cheques WHERE id::text=(storage.foldername(name))[1]));
CREATE POLICY cheque_photo_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='cheque-photos' AND public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.guard_cheque_supplier_debt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF coalesce(current_setting('primegrid.cheque_internal',true),'off')<>'on' AND EXISTS(SELECT 1 FROM public.cheques WHERE payable_id=OLD.id AND (status='Repassado' OR third_party_pending)) THEN RAISE EXCEPTION 'Dívida vinculada a cheque repassado; confira no controle de cheques'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER cheque_supplier_debt_guard BEFORE UPDATE OR DELETE ON public.payables FOR EACH ROW EXECUTE FUNCTION public.guard_cheque_supplier_debt();
CREATE OR REPLACE FUNCTION public.guard_receivable_paid_value() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF coalesce(current_setting('primegrid.cheque_internal',true),'off')<>'on' THEN
  IF TG_OP='INSERT' AND NEW.paid_value<>0 THEN RAISE EXCEPTION 'Cadastre sem valor pago e registre a baixa com vínculo'; END IF;
  IF TG_OP='UPDATE' AND (NEW.paid_value<>OLD.paid_value OR (NEW.status IS DISTINCT FROM OLD.status AND (NEW.status='Recebido' OR OLD.status='Recebido'))) THEN RAISE EXCEPTION 'Use registrar pagamento ou desfazer baixa vinculada'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER receivable_paid_value_guard BEFORE INSERT OR UPDATE ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.guard_receivable_paid_value();
CREATE OR REPLACE FUNCTION public.cheque_return_category() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE category_before text; BEGIN
 IF NEW.to_status='Devolvido' AND NEW.transaction_id IS NOT NULL THEN
  SELECT t.category INTO category_before FROM public.cheque_events e JOIN public.transactions t ON t.id=e.transaction_id WHERE e.cheque_id=NEW.cheque_id AND e.to_status='Compensado' ORDER BY e.created_at DESC LIMIT 1;
  IF category_before IS NULL THEN RAISE EXCEPTION 'Crédito de origem não encontrado'; END IF;
  UPDATE public.transactions SET category=category_before WHERE id=NEW.transaction_id;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER cheque_return_category_guard BEFORE INSERT ON public.cheque_events FOR EACH ROW EXECUTE FUNCTION public.cheque_return_category();