import { LayoutDashboard, Receipt, BarChart3, Building2, Settings, FileText } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";

export function BottomNav() {
  const { isAdmin, isGerencia, isLancamentos, isNfControl } = useAuth();

  const items = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, visible: isAdmin || isGerencia },
    { title: "Lançamentos", url: "/lancamentos", icon: Receipt, visible: isAdmin || isGerencia || isLancamentos },
    { title: "Resumo", url: "/resumo", icon: BarChart3, visible: isAdmin || isGerencia },
    { title: "Patrimônio", url: "/patrimonial", icon: Building2, visible: isAdmin || isGerencia },
    { title: "NF", url: "/nf", icon: FileText, visible: isAdmin || isNfControl },
    { title: "Config", url: "/configuracoes", icon: Settings, visible: isAdmin },
  ].filter(i => i.visible);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t md:hidden">
      <div className="flex justify-around items-center h-16">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/"}
            className="flex flex-col items-center gap-1 px-2 py-2 text-muted-foreground text-[10px] transition-colors"
            activeClassName="text-primary font-medium"
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
