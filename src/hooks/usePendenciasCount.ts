import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { A_CLASSIFICAR } from "@/utils/categories";

/** Quantidade de lançamentos aguardando classificação (atualiza a cada 60s e via evento). */
export function usePendenciasCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { count: c } = await supabase.from("transactions")
        .select("id", { count: "exact", head: true }).eq("category", A_CLASSIFICAR);
      if (!cancelled) setCount(c ?? 0);
    };
    load();
    const t = setInterval(load, 60000);
    window.addEventListener("pendencias:changed", load);
    return () => { cancelled = true; clearInterval(t); window.removeEventListener("pendencias:changed", load); };
  }, []);
  return count;
}

export const notifyPendenciasChanged = () => window.dispatchEvent(new Event("pendencias:changed"));
