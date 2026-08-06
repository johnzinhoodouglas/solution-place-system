import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AUTH_TITLE = "Acessar o sistema — Solution Place";
const AUTH_DESCRIPTION =
  "Entre com seu acesso corporativo para usar o sistema de gestão ISO 9001:2015 da Solution Place.";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: AUTH_TITLE },
      { name: "description", content: AUTH_DESCRIPTION },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: AUTH_TITLE },
      { property: "og:description", content: AUTH_DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/app", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function onSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) {
      toast.error("Falha ao entrar", { description: error.message });
      return;
    }
    toast.success("Bem-vindo(a)!");
  }

  async function onSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const nome = String(fd.get("nome"));
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: nome },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Falha ao criar acesso", { description: error.message });
      return;
    }
    toast.success("Acesso criado. Verifique seu e-mail se necessário.");
  }

  async function onGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (result.error) {
      toast.error("Falha no Google", { description: result.error.message });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-md"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Solution Place</p>
            <p className="text-xs text-muted-foreground">Sistema ISO 9001:2015</p>
          </div>
        </Link>

        <div
          className="rounded-xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-elevated)" }}
        >
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar acesso</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={onSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">E-mail</Label>
                  <Input id="si-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pw">Senha</Label>
                  <Input
                    id="si-pw"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={onSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-nome">Nome completo</Label>
                  <Input id="su-nome" name="nome" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">E-mail corporativo</Label>
                  <Input id="su-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pw">Senha</Label>
                  <Input
                    id="su-pw"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres. Após criar, a Diretoria/Master atribuirá seu setor e papel.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando..." : "Criar acesso"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={onGoogle}
            disabled={loading}
          >
            Continuar com Google
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao acessar você concorda com as políticas internas da Solution Place.
        </p>
      </div>
    </div>
  );
}
