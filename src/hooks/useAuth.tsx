import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isGerencia: boolean;
  isLancamentos: boolean;
  isNfControl: boolean;
  isLancador: boolean;
  canEdit: boolean; // admin only
  canViewAll: boolean; // admin + gerencia
  canManageLancamentos: boolean; // admin + lancamentos
  canManageNF: boolean; // admin + nf_control
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function resolveRole(userId: string): Promise<AppRole | null> {
  console.log("[useAuth] resolveRole: fetching role for user", userId);
  const { data, error } = await supabase.rpc("get_user_role", { _user_id: userId });
  if (error) {
    console.error("[useAuth] resolveRole: RPC error", error);
    return null;
  }
  console.log("[useAuth] resolveRole: RPC returned", data);
  return (data as AppRole | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    const syncAuthState = async (nextSession: Session | null) => {
      const currentRequestId = ++requestId;

      if (!mounted) return;

      console.log("[useAuth] syncAuthState: session changed", {
        hasSession: Boolean(nextSession),
        userId: nextSession?.user?.id ?? null,
      });

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(true);

      if (!nextSession?.user) {
        console.log("[useAuth] syncAuthState: no session, clearing role");
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const nextRole = await resolveRole(nextSession.user.id);

        if (!mounted || currentRequestId !== requestId) {
          console.log("[useAuth] syncAuthState: ignoring stale role resolution", {
            currentRequestId,
            latestRequestId: requestId,
            nextRole,
          });
          return;
        }

        console.log("[useAuth] syncAuthState: resolved role", nextRole);
        setRole(nextRole);
        setLoading(false);
      } catch (error) {
        console.error("[useAuth] syncAuthState: failed to fetch role", error);

        if (!mounted || currentRequestId !== requestId) {
          return;
        }

        setRole(null);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncAuthState(nextSession);
    });

    supabase.auth.getSession()
      .then(({ data: { session: nextSession } }) => {
        void syncAuthState(nextSession);
      })
      .catch((error) => {
        console.error("Failed to get session:", error);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      requestId += 1;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
  };

    const isAdmin = role === "admin";
  const isGerencia = role === "gerencia";
  const isLancamentos = role === "lancamentos";
  const isNfControl = role === "nf_control";
  const isLancador = role === "lancador";

  const value: AuthContextType = {
    session, user, role, loading,
    isAdmin, isGerencia, isLancamentos, isNfControl, isLancador,
    canEdit: isAdmin,
    canViewAll: isAdmin || isGerencia,
    canManageLancamentos: isAdmin || isLancamentos,
    canManageNF: isAdmin || isNfControl,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
