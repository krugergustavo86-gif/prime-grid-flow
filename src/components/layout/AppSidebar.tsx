import { LayoutDashboard, Receipt, BarChart3, Building2, Settings, FileText, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin, isGerencia, isLancamentos, isNfControl, role, user, signOut } = useAuth();

  const items = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, visible: isAdmin || isGerencia },
    { title: "Lançamentos", url: "/lancamentos", icon: Receipt, visible: isAdmin || isGerencia || isLancamentos },
    { title: "Resumo Anual", url: "/resumo", icon: BarChart3, visible: isAdmin || isGerencia },
    { title: "Patrimonial", url: "/patrimonial", icon: Building2, visible: isAdmin || isGerencia },
    { title: "Controle NF", url: "/nf", icon: FileText, visible: isAdmin || isNfControl },
    { title: "Configurações", url: "/configuracoes", icon: Settings, visible: isAdmin },
  ].filter(i => i.visible);

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    gerencia: "Gerência",
    lancamentos: "Lançamentos",
    nf_control: "Controle NF",
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`px-4 py-6 ${collapsed ? "px-2" : ""}`}>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Prime Grid</h1>
              <p className="text-xs text-sidebar-foreground/60">Financeiro</p>
            </div>
          )}
          {collapsed && <div className="text-center text-sidebar-foreground font-bold text-sm">PG</div>}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User info at bottom */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          {!collapsed && (
            <div className="mb-2">
              <p className="text-xs text-sidebar-foreground/80 truncate">{user?.email}</p>
              <p className="text-[10px] text-sidebar-foreground/50">{role ? roleLabels[role] : ""}</p>
            </div>
          )}
          <Button variant="ghost" size={collapsed ? "icon" : "sm"} className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
