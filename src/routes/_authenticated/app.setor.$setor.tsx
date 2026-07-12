import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SETOR_MAP, podeAcessarSetor, podeIntervir } from "@/lib/setores";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/_authenticated/app/setor/$setor")({
  loader: ({ params }) => {
    const setor = SETOR_MAP[params.setor];
    if (!setor) throw notFound();
    return { setor };
  },
  component: SetorPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-xl font-semibold">Setor não encontrado</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        O setor solicitado não existe no sistema.
      </p>
      <Button asChild className="mt-4">
        <Link to="/app">Voltar ao dashboard</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-xl font-semibold">Erro ao carregar setor</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function SetorPage() {
  const { setor } = Route.useLoaderData();
  const { roles, loading } = useCurrentUser();

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const permitido = podeAcessarSetor(roles, setor);
  const admin = podeIntervir(roles);

  if (!permitido) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Você não tem permissão para acessar o setor <strong>{setor.label}</strong>.
        </p>
        <Button asChild className="mt-4">
          <Link to="/app">Voltar</Link>
        </Button>
      </div>
    );
  }

  const Icon = setor.icon;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/15 text-primary"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{setor.label}</h1>
              {admin && (
                <Badge variant="secondary" className="border-accent/40 bg-accent/10 text-accent">
                  Modo intervenção
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{setor.descricao}</p>
          </div>
        </div>
      </div>

      {/* Fluxograma da etapa */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Fluxo:
        </span>
        {setor.origem ? (
          <Link
            to="/app/setor/$setor"
            params={{ setor: setor.origem }}
            className="rounded-md border border-border px-3 py-1 text-xs hover:border-primary/50"
          >
            {SETOR_MAP[setor.origem]?.label ?? setor.origem}
          </Link>
        ) : (
          <span className="rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
            Início do fluxo
          </span>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="rounded-md border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {setor.label}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        {setor.destino ? (
          <Link
            to="/app/setor/$setor"
            params={{ setor: setor.destino }}
            className="rounded-md border border-border px-3 py-1 text-xs hover:border-primary/50"
          >
            {SETOR_MAP[setor.destino]?.label ?? setor.destino}
          </Link>
        ) : (
          <span className="rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
            Fim do fluxo
          </span>
        )}
      </div>

      {/* Placeholder de conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" />
            Módulo em construção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Este setor faz parte da <strong>Fase 1 — Fundação</strong> do sistema. As
            funcionalidades operacionais (registros, formulários, dashboards em tempo real e
            rastreabilidade da OS) serão liberadas nas próximas fases:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-xs">
            <li><strong>Fase 2:</strong> Recepção, OS, timeline, etapas de produção.</li>
            <li><strong>Fase 3:</strong> Qualidade + Segurança (NCs, EPIs, incidentes).</li>
            <li><strong>Fase 4:</strong> Vendas, Compras, Financeiro, Fiscal.</li>
            <li><strong>Fase 5:</strong> Recicláveis, PDCA, log de auditoria, relatórios ISO.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
