import { LayoutDashboard, Receipt, BarChart3, Building2, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Lançamentos", url: "/lancamentos", icon: Receipt },
  { title: "Resumo", url: "/resumo", icon: BarChart3 },
  { title: "Patrimônio", url: "/patrimonial", icon: Building2 },
  { title: "Config", url: "/configuracoes", icon: Settings },
];

export function BottomNav() {
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
