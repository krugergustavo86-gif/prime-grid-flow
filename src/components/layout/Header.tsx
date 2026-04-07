import { SidebarTrigger } from "@/components/ui/sidebar";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-14 flex items-center gap-3 border-b bg-card px-4 shrink-0">
      <SidebarTrigger className="hidden md:flex" />
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
    </header>
  );
}
