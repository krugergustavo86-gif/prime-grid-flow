import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useAutoDebitCatchUp } from "@/hooks/useAutoDebitCatchUp";
import DashboardPage from "./pages/DashboardPage";
import LancamentosPage from "./pages/LancamentosPage";
import LancadorPage from "./pages/LancadorPage";
import ResumoPage from "./pages/ResumoPage";
import PatrimonialPage from "./pages/PatrimonialPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import NFControlPage from "./pages/NFControlPage";
import UsersPage from "./pages/UsersPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";



function AppRoutes() {
  const { session, loading, role, isAdmin, isGerencia, isLancamentos, isNfControl, isLancador, isContabilidade } = useAuth();
  useAutoDebitCatchUp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  // No role assigned yet
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card rounded-lg border p-6 text-center max-w-sm">
          <h2 className="font-semibold text-foreground mb-2">Acesso Pendente</h2>
          <p className="text-sm text-muted-foreground">Seu perfil ainda não foi configurado pelo administrador. Entre em contato com a gerência.</p>
        </div>
      </div>
    );
  }

  // Lançador: dedicated minimal screen, no sidebar/bottomnav
  if (isLancador) {
    return (
      <Routes>
        <Route path="/lancador" element={<LancadorPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/lancador" replace />} />
      </Routes>
    );
  }

  // Determine accessible routes based on role
  const canAccessDashboard = isAdmin || isGerencia || isContabilidade;
  const canAccessLancamentos = isAdmin || isGerencia || isLancamentos || isContabilidade;
  const canAccessResumo = isAdmin || isGerencia || isContabilidade;
  const canAccessPatrimonial = isAdmin || isGerencia || isContabilidade;
  const canAccessConfig = isAdmin;
  const canAccessNF = isAdmin || isGerencia || isNfControl || isContabilidade;

  // Default route based on role
  const defaultRoute = isNfControl ? "/nf" : isLancamentos ? "/lancamentos" : "/";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-h-screen">
          <Routes>
            <Route path="/" element={canAccessDashboard ? <DashboardPage /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/lancamentos" element={canAccessLancamentos ? <LancamentosPage /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/resumo" element={canAccessResumo ? <ResumoPage /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/patrimonial" element={canAccessPatrimonial ? <PatrimonialPage /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/nf" element={canAccessNF ? <NFControlPage /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/usuarios" element={isAdmin ? <UsersPage /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/configuracoes" element={canAccessConfig ? <ConfiguracoesPage /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
