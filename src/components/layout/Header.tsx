import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface HeaderProps {
  title: string;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  gerencia: "Gerência",
  lancamentos: "Lançamentos",
  nf_control: "NF",
  lancador: "Lançador",
};

export function Header({ title }: HeaderProps) {
  const { role, user, signOut } = useAuth();

  return (
    <header className="h-14 flex items-center gap-3 border-b bg-card px-4 shrink-0">
      <SidebarTrigger className="hidden md:flex" />
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        {role && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            {user?.email?.split("@")[0]} · {roleLabels[role]}
          </span>
        )}
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
