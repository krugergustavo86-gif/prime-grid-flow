import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import type { ServiceInvoice, ServiceReceipt, ServiceInvoiceDraft } from "@/utils/serviceInvoiceTotals";

export function useServiceInvoices() {
  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
  const [receipts, setReceipts] = useState<ServiceReceipt[]>([]);
  const [attachments, setAttachments] = useState<Tables<"service_invoice_attachments">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mounted = useRef(false);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    try {
      const rows: ServiceInvoice[] = [], linked: ServiceReceipt[] = [], files: Tables<"service_invoice_attachments">[] = [];
      for (let page = 0; page < 100; page++) {
        const [a, b, c] = await Promise.all([
          supabase.from("service_invoices").select("*").order("issue_date", { ascending: false }).order("id").range(page * 1000, page * 1000 + 999),
          supabase.rpc("list_service_receipts").range(page * 1000, page * 1000 + 999),
          supabase.from("service_invoice_attachments").select("*").order("id").range(page * 1000, page * 1000 + 999),
        ]);
        if (a.error || b.error || c.error) throw a.error || b.error || c.error;
        rows.push(...(a.data || [])); linked.push(...(b.data || [])); files.push(...(c.data || []));
        if (!mounted.current || current !== version.current) return;
        if ((a.data?.length || 0) < 1000 && (b.data?.length || 0) < 1000 && (c.data?.length || 0) < 1000) break;
      }
      if (mounted.current && current === version.current) { setInvoices(rows); setReceipts(linked); setAttachments(files); setError(false); }
    } catch { if (mounted.current) { setError(true); toast.error("Não foi possível carregar as NFS-e"); } }
    finally { if (mounted.current && current === version.current) setLoading(false); }
  }, []);
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false; version.current++; }; }, [refresh]);

  const save = async (draft: ServiceInvoiceDraft, id?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const result = id
      ? await supabase.from("service_invoices").update(draft).eq("id", id).select().single()
      : await supabase.from("service_invoices").insert({ ...draft, id: crypto.randomUUID(), created_by: user.id }).select().single();
    if (result.error) { toast.error("Não foi possível salvar: " + result.error.message); return null; }
    await refresh();
    return result.data;
  };
  return { invoices, receipts, attachments, loading, error, refresh, save };
}