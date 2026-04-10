import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * On app load, calls the process-auto-debits edge function
 * with a 7-day lookback to catch up any missed auto-debits.
 */
export function useAutoDebitCatchUp() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const catchUp = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("process-auto-debits", {
          body: { lookbackDays: 7 },
        });

        if (error) {
          console.error("Auto-debit catch-up error:", error);
          return;
        }

        if (data?.generated > 0) {
          toast.info(`${data.generated} lançamento(s) automático(s) gerado(s) retroativamente`, {
            duration: 6000,
          });
        }
      } catch (err) {
        console.error("Auto-debit catch-up failed:", err);
      }
    };

    catchUp();
  }, []);
}
