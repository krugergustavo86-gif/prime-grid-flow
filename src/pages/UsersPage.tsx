import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, KeyRound, UserCog, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface UserItem {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: string | null;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador", desc: "Acesso total" },
  { value: "gerencia", label: "Gerência", desc: "Visualiza tudo" },
  { value: "lancamentos", label: "Lançamentos", desc: "Entradas e saídas" },
  { value: "nf_control", label: "Controle NF", desc: "Notas fiscais" },
];

const roleBadgeColor: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  gerencia: "bg-chart-entrada text-success-foreground",
  lancamentos: "bg-chart-blue-medium text-primary-foreground",
  nf_control: "bg-warning text-warning-foreground",
};

async function callManageUsers(action: string, params: Record<string, string> = {}) {
  const { data, error } = await supabase.functions.invoke("manage-users", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callManageUsers("list");
      setUsers(data);
    } catch (e: any) {
      toast.error("Erro ao carregar usuários: " + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (email: string, password: string, role: string) => {
    try {
      await callManageUsers("create", { email, password, role });
      toast.success("Usuário criado com sucesso");
      setCreateOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await callManageUsers("update_role", { user_id: userId, role });
      toast.success("Perfil atualizado");
      fetchUsers();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await callManageUsers("delete", { user_id: userId });
      toast.success("Usuário removido");
      fetchUsers();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    try {
      await callManageUsers("reset_password", { user_id: userId, new_password: newPassword });
      toast.success("Senha atualizada");
      setResetOpen(false);
      setSelectedUser(null);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Gestão de Usuários" />
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 space-y-4">
        <div className="bg-card rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Usuários ({users.length})</h3>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo Usuário
            </Button>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum usuário cadastrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">E-mail</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Perfil</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Último acesso</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{u.email}</td>
                      <td className="p-3">
                        <Select
                          value={u.role || ""}
                          onValueChange={(val) => handleUpdateRole(u.id, val)}
                        >
                          <SelectTrigger className="w-[160px] h-8">
                            <SelectValue placeholder="Sem perfil">
                              {u.role ? (
                                <Badge className={`${roleBadgeColor[u.role] || ""} text-xs`}>
                                  {ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">Sem perfil</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map(r => (
                              <SelectItem key={r.value} value={r.value}>
                                <div>
                                  <span className="font-medium">{r.label}</span>
                                  <span className="text-muted-foreground text-xs ml-2">— {r.desc}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "Nunca"}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Resetar senha"
                            onClick={() => { setSelectedUser(u); setResetOpen(true); }}>
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Excluir">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O usuário <strong>{u.email}</strong> será removido permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(u.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Role legend */}
        <div className="bg-card rounded-lg border p-4">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Perfis Disponíveis</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ROLE_OPTIONS.map(r => (
              <div key={r.value} className="flex items-start gap-2">
                <UserCog className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      <ResetPasswordModal open={resetOpen} onClose={() => { setResetOpen(false); setSelectedUser(null); }} onSave={handleResetPassword} user={selectedUser} />
    </div>
  );
}

function CreateUserModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (email: string, password: string, role: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("gerencia");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setEmail(""); setPassword(""); setRole("gerencia"); }
  }, [open]);

  const handleSubmit = async () => {
    if (!email || !password) { toast.error("Preencha e-mail e senha"); return; }
    if (password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    setSaving(true);
    await onSave(email, password, role);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>E-mail *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@email.com" /></div>
          <div><Label>Senha *</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          <div>
            <Label>Perfil *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label} — {r.desc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordModal({ open, onClose, onSave, user }: { open: boolean; onClose: () => void; onSave: (userId: string, password: string) => void; user: UserItem | null }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setPassword(""); }, [open]);

  const handleSubmit = async () => {
    if (!password || password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    if (!user) return;
    setSaving(true);
    await onSave(user.id, password);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>Resetar Senha</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <div><Label>Nova senha</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Atualizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
