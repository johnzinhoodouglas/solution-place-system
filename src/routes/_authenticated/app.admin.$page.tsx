import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserCog, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { podeIntervir, ROLE_LABEL, type AppRole } from "@/lib/setores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGES = ["usuarios", "sistema"] as const;

export const Route = createFileRoute("/_authenticated/app/admin/$page")({
  loader: ({ params }) => {
    if (!PAGES.includes(params.page as (typeof PAGES)[number])) throw notFound();
    return { page: params.page as (typeof PAGES)[number] };
  },
  component: AdminPage,
  notFoundComponent: () => (
    <div className="text-center">
      <h2 className="text-lg font-semibold">Página não encontrada</h2>
      <Button asChild className="mt-3">
        <Link to="/app">Voltar</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => <p className="text-sm text-destructive">{error.message}</p>,
});

function AdminPage() {
  const { page } = Route.useLoaderData();
  const { roles, loading } = useCurrentUser();

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!podeIntervir(roles)) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Somente Diretoria ou Master acessam esta área.
        </p>
      </div>
    );
  }

  return page === "usuarios" ? <UsuariosPage /> : <SistemaPage />;
}

type UserRow = {
  id: string;
  nome: string;
  email: string;
  setor: string | null;
  cargo: string | null;
  ativo: boolean;
  roles: AppRole[];
};

const ALL_ROLES: AppRole[] = [
  "master",
  "diretoria",
  "qualidade",
  "engenharia",
  "vendas",
  "compras",
  "financeiro",
  "producao",
  "seguranca",
  "fiscal",
  "recepcao",
];

function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState(true);

  async function load() {
    setBusy(true);
    const [{ data: profiles }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const rolesByUser = new Map<string, AppRole[]>();
    (rolesData ?? []).forEach((r: { user_id: string; role: AppRole }) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    setUsers(
      (profiles ?? []).map((p) => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        setor: p.setor,
        cargo: p.cargo,
        ativo: p.ativo,
        roles: rolesByUser.get(p.id) ?? [],
      })),
    );
    setBusy(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addRole(userId: string, role: AppRole) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast.error("Falha ao atribuir papel", { description: error.message });
      return;
    }
    toast.success(`Papel "${ROLE_LABEL[role]}" atribuído`);
    load();
  }

  async function removeRole(userId: string, role: AppRole) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);
    if (error) {
      toast.error("Falha ao remover papel", { description: error.message });
      return;
    }
    toast.success("Papel removido");
    load();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <UserCog className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Usuários & Papéis</h1>
          <p className="text-sm text-muted-foreground">
            Atribua papéis por setor. Diretoria e Master têm acesso completo.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Colaboradores</CardTitle>
        </CardHeader>
        <CardContent>
          {busy ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead className="w-64">Atribuir papel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 && (
                          <span className="text-xs text-muted-foreground">Sem papel</span>
                        )}
                        {u.roles.map((r) => (
                          <Badge
                            key={r}
                            variant="secondary"
                            className="cursor-pointer border-border"
                            onClick={() => removeRole(u.id, r)}
                            title="Clique para remover"
                          >
                            {ROLE_LABEL[r]} ✕
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select onValueChange={(v) => addRole(u.id, v as AppRole)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolher papel..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Nenhum usuário ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-accent/40 bg-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-accent">
            <ShieldCheck className="h-4 w-4" />
            Primeiro Master do sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            O primeiro acesso <strong>master</strong> deve ser atribuído pela Diretoria a partir
            desta tela. Se ainda não existe nenhum diretor/master, o Master do sistema pode ser
            configurado diretamente no banco (via Cloud) executando:
          </p>
          <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs">
            {`INSERT INTO public.user_roles (user_id, role)
VALUES ('<uuid-do-usuario>', 'diretoria');`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function SistemaPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Configurações gerais, auditoria e manutenção — acesso Master.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auditoria e manutenção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Log de auditoria (quem alterou o quê), rotinas de verificação, exportação de relatórios
            ISO e ferramentas de manutenção serão habilitados na <strong>Fase 5</strong>.
          </p>
          <p>
            Este acesso permite ao Master inspecionar e corrigir dados em qualquer etapa do processo
            produtivo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
