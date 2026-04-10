import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logoPrimegrid from "@/assets/logo-primegrid.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Erro ao entrar: " + error.message);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("E-mail de recuperação enviado!");
      setMode("login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logoPrimegrid} alt="PrimeGrid Energia" width={120} height={120} className="mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Financeiro</p>
        </div>

        <div className="bg-card rounded-lg border p-6 space-y-4">
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="font-semibold text-foreground text-center">Entrar</h2>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Entrar
              </Button>
              <Button type="button" variant="link" className="w-full text-sm" onClick={() => setMode("forgot")}>
                Esqueci minha senha
              </Button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <h2 className="font-semibold text-foreground text-center">Recuperar Senha</h2>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar link de recuperação
              </Button>
              <Button type="button" variant="link" className="w-full text-sm" onClick={() => setMode("login")}>
                Voltar ao login
              </Button>
            </form>
          )}
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          PrimeGrid Energia Ltda — CNPJ 39.430.957/0001-03
        </p>
      </div>
    </div>
  );
}
