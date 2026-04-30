import { useState, useCallback, useEffect } from "react";
import { AppConfig } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEFAULT_CONFIG: AppConfig = { saldoAnterior: 409000, ano: 2026, numSocios: 4 };

export function useAppConfig() {
  const [config, setConfigState] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("app_config")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        if (data) {
          setConfigState({
            saldoAnterior: Number(data.saldo_anterior),
            ano: data.ano,
            numSocios: data.num_socios,
          });
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchConfig();
    return () => { cancelled = true; };
  }, []);

  const setConfig = useCallback(async (newConfig: AppConfig) => {
    setConfigState(newConfig);

    const { data: current, error: fetchError } = await supabase
      .from("app_config")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (fetchError || !current?.id) {
      console.error("Failed to load app_config row:", fetchError);
      toast.error("Erro ao salvar configuração");
      return;
    }

    const { error } = await supabase
      .from("app_config")
      .update({
        saldo_anterior: newConfig.saldoAnterior,
        ano: newConfig.ano,
        num_socios: newConfig.numSocios,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);

    if (error) {
      console.error("Failed to update config:", error);
      toast.error("Erro ao salvar configuração");
    }
  }, []);

  return { config, setConfig, loading };
}
