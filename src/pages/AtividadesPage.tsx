import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Lock, Plus, Pencil, Trash2, LogIn, LogOut, Activity, Filter } from "lucide-react";
import { toast } from "sonner";
import { formatDateBR } from "@/utils/formatters";

const ACTIVITIES_PASSWORD = "29304872";
const SESSION_KEY = "primegrid_activities_unlocked";

type AuditRow = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_META: Record<string, { label: string; color: string; Icon: typeof Plus }> = {
  CREATE: { label: "Criação", color: "text-chart-entrada bg-chart-entrada/10", Icon: Plus },
  UPDATE: { label: "Edição", color: "text-chart-saida bg-chart-saida/10", Icon: Pencil },
  DELETE: { label: "Exclusão", color: "text-destructive bg-destructive/10", Icon: Trash2 },
  LOGIN: { label: "Login", color: "text-primary bg-primary/10", Icon: LogIn },
  LOGOUT: { label: "Logout", color: "text-muted-foreground bg-muted", Icon: LogOut },
};

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pwd, setPwd] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd === ACTIVITIES_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onUnlock();
    } else {
      toast.error("Senha incorreta");
      setPwd("");
    }
  };
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Acesso restrito</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Insira a senha de acesso ao painel de atividades.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            placeholder="Senha"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoFocus
          />
          <Button type="submit" className="w-full">Desbloquear</Button>
        </form>
      </Card>
    </div>
  );
}

export default function AtividadesPage() {
  const { isGerencia, isAdmin } = useAuth();
  const allowed = isGerencia || isAdmin;
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    if (!allowed || !unlocked) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (cancelled) return;
      if (error) {
        console.error("Failed to load audit_log:", error);
        toast.error("Erro ao carregar atividades");
      } else {
        setRows((data || []) as AuditRow[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [allowed, unlocked]);

  const users = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.user_email) set.add(r.user_email); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterAction !== "all" && r.action !== filterAction) return false;
      if (filterUser !== "all" && r.user_email !== filterUser) return false;
      if (dateFrom && r.created_at < dateFrom) return false;
      if (dateTo && r.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [rows, filterAction, filterUser, dateFrom, dateTo]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, AuditRow[]> = {};
    filtered.forEach(r => {
      const day = r.created_at.slice(0, 10);
      if (!groups[day]) groups[day] = [];
      groups[day].push(r);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (!allowed) return <Navigate to="/" replace />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Painel de Atividades" />
      {!unlocked ? (
        <PasswordGate onUnlock={() => setUnlocked(true)} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4 space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Filtros</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo de ação</label>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(ACTION_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Usuário</label>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">De</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Até</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "evento" : "eventos"}
              </p>
              {(filterAction !== "all" || filterUser !== "all" || dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setFilterAction("all"); setFilterUser("all"); setDateFrom(""); setDateTo("");
                }}>Limpar filtros</Button>
              )}
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Carregando...</div>
          ) : groupedByDate.length === 0 ? (
            <Card className="p-10 text-center">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {groupedByDate.map(([day, events]) => (
                <div key={day}>
                  <div className="sticky top-0 bg-background/95 backdrop-blur z-10 py-2 mb-2 border-b">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {formatDateBR(day)} · {events.length} {events.length === 1 ? "evento" : "eventos"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {events.map((ev) => {
                      const meta = ACTION_META[ev.action] ?? { label: ev.action, color: "text-muted-foreground bg-muted", Icon: Activity };
                      const time = new Date(ev.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                      return (
                        <Card key={ev.id} className="p-3 flex items-start gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                            <meta.Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-foreground">{meta.label}</span>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground truncate">{ev.user_email ?? "—"}</span>
                              <span className="text-xs text-muted-foreground ml-auto tabular-nums">{time}</span>
                            </div>
                            <p className="text-sm text-foreground mt-0.5 break-words">{ev.description ?? "—"}</p>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
