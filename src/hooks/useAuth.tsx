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

    // Safety timeout - never stay loading forever
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth loading timeout - forcing load complete");
        setLoading(false);
      }
    }, 5000);

    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const { data } = await supabase.rpc("get_user_role", { _user_id: session.user.id });
          if (mounted) setRole(data as AppRole | null);
        } catch (e) {
          console.error("Failed to fetch role:", e);
        }
      } else {
        setRole(null);
      }
      if (mounted) setLoading(false);
    });

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const { data } = await supabase.rpc("get_user_role", { _user_id: session.user.id });
          if (mounted) setRole(data as AppRole | null);
        } catch (e) {
          console.error("Failed to fetch role:", e);
        }
      }
      if (mounted) setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
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
