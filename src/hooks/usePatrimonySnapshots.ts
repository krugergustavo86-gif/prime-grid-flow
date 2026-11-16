import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { SnapshotDetail, SnapshotRow } from "@/utils/patrimonySnapshot";

const r2 = (n: number) => Math.round(n * 100) / 100;
function roundDetail(d: SnapshotDetail): SnapshotDetail {
  return { ...d, groups: Object.fromEntries(Object.entries(d.groups).map(([k, v]) => [k, r2(v)])), cash: r2(d.cash), receivables: r2(d.receivables), stock: r2(d.stock), loans: r2(d.loans), payables: r2(d.payables), gross: r2(d.gross), net: r2(d.net) };
}

/** Lê as fotos mensais e mantém a foto do mês corrente (totais + detalhe) atualizada. Única gravação automática de fotos. */
export function usePatrimonySnapshots(current: SnapshotDetail | null, numSocios: number) {
  const [snapshots, setSnapshots] = useState<(SnapshotRow & { id: string })[]>([]);
  const [loaded, setLoaded] = useState(false);
  const saving = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("patrimony_snapshots").select("id, month, gross_patrimony, total_debt, net_equity_per_partner, detail");
    if (error) { console.error(error); return; }
    setSnapshots((data || []).map(r => ({ id: r.id, month: r.month, gross_patrimony: Number(r.gross_patrimony), total_debt: Number(r.total_debt), net_equity_per_partner: Number(r.net_equity_per_partner), detail: (r.detail as unknown as SnapshotDetail) ?? null })));
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!current || !loaded || saving.current) return;
    const now = new Date();
    const month = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    const detail = roundDetail(current);
    const existing = snapshots.find(s => s.month === month);
    if (existing && existing.detail && JSON.stringify(roundDetail(existing.detail)) === JSON.stringify(detail)) return;
    const payload = {
      month, gross_patrimony: detail.gross, total_debt: r2(detail.loans + detail.payables),
      net_equity_per_partner: numSocios > 0 ? detail.net / numSocios : detail.net,
      notes: "Atualizado automaticamente", detail: detail as unknown as Json,
    };
    saving.current = true;
    (async () => {
      const { error } = existing
        ? await supabase.from("patrimony_snapshots").update(payload).eq("id", existing.id)
        : await supabase.from("patrimony_snapshots").insert(payload);
      if (error) console.error(error);
      await load();
      saving.current = false;
    })();
  }, [current, loaded, snapshots, numSocios, load]);

  return { snapshots, reload: load };
}
