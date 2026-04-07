import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import DashboardPage from "./pages/DashboardPage";
import LancamentosPage from "./pages/LancamentosPage";
import ResumoPage from "./pages/ResumoPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <div className="hidden md:block">
              <AppSidebar />
            </div>
            <div className="flex-1 flex flex-col min-h-screen">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/lancamentos" element={<LancamentosPage />} />
                <Route path="/resumo" element={<ResumoPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <BottomNav />
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
