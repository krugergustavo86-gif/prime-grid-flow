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
  canEdit: boolean; // admin only
  canViewAll: boolean; // admin + gerencia
  canManageLancamentos: boolean; // admin + lancamentos
  canManageNF: boolean; // admin + nf_control
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const finishLoading = () => {
      if (mounted) setLoading(false);
    };

    const resolveRole = async (userId: string): Promise<AppRole | null> => {
      const { data: directRole, error: directError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (directError) {
        console.error("Failed to fetch role from table:", directError);
      }

      if (directRole?.role) {
        return directRole.role as AppRole;
      }

      const { data: rpcRole, error: rpcError } = await supabase.rpc("get_user_role", { _user_id: userId });

      if (rpcError) {
        throw rpcError;
      }

      return (rpcRole as AppRole | null) ?? null;
    };

    const syncAuthState = async (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setRole(null);
        finishLoading();
        return;
      }

      try {
        const nextRole = await resolveRole(nextSession.user.id);
        if (mounted) setRole(nextRole);
      } catch (error) {
        console.error("Failed to fetch role:", error);
        if (mounted) setRole(null);
      } finally {
        finishLoading();
      }
    };

    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn("Auth loading timeout - forcing load complete");
        setLoading(false);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncAuthState(nextSession);
    });

    supabase.auth.getSession()
      .then(({ data: { session: nextSession } }) => {
        void syncAuthState(nextSession);
      })
      .catch(() => {
        finishLoading();
      });

    return () => {
      mounted = false;
      clearTimeout(timeout);
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

  const value: AuthContextType = {
    session, user, role, loading,
    isAdmin, isGerencia, isLancamentos, isNfControl,
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
