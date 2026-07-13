import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Recycle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SETORES, podeAcessarSetor, podeIntervir } from "@/lib/setores";
import { useCurrentUser } from "@/lib/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { ETAPA_LABEL, ETAPAS_ORDEM, type OsEtapa } from "@/lib/os";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { profile, roles, loading } = useCurrentUser();
  const setoresVisiveis = SETORES.filter((s) => podeAcessarSetor(roles, s));
  const admin = podeIntervir(roles);

  const [stats, setStats] = useState({
    emProducao: 0,
    entreguesMes: 0,
    porEtapa: {} as Record<OsEtapa, number>,
  });

  useEffect(() => {
    (async () => {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const [{ data: emProdData }, { count: entregues }] = await Promise.all([
        supabase
          .from("ordens_servico")
          .select("etapa_atual, status")
          .in("status", ["aberta", "em_andamento", "pausada"]),
        supabase
          .from("ordens_servico")
          .select("id", { count: "exact", head: true })
          .eq("status", "concluida")
          .gte("data_saida", inicioMes.toISOString()),
      ]);

      const porEtapa = {} as Record<OsEtapa, number>;
      (emProdData ?? []).forEach((r: { etapa_atual: OsEtapa }) => {
        porEtapa[r.etapa_atual] = (porEtapa[r.etapa_atual] ?? 0) + 1;
      });

      setStats({
        emProducao: emProdData?.length ?? 0,
        entreguesMes: entregues ?? 0,
        porEtapa,
      });
    })();
  }, []);

  const KPIS = [
    { label: "OS em produção", value: String(stats.emProducao), icon: Activity, tone: "primary" as const },
    { label: "Não conformidades abertas", value: "0", icon: AlertTriangle, tone: "warning" as const },
    { label: "Entregues no mês", value: String(stats.entreguesMes), icon: CheckCircle2, tone: "success" as const },
    { label: "Sucata reciclada (kg)", value: "0", icon: Recycle, tone: "accent" as const },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {profile?.nome?.split(" ")[0] || "colaborador"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral do sistema de gestão da qualidade — Solution Place.
        </p>
        {admin && (
          <Badge variant="secondary" className="mt-3 border-accent/40 bg-accent/10 text-accent">
            Acesso privilegiado — pode intervir em qualquer etapa
          </Badge>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <Card key={k.label} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {k.label}
              </CardTitle>
              <k.icon
                className={
                  k.tone === "warning"
                    ? "h-4 w-4 text-warning"
                    : k.tone === "success"
                      ? "h-4 w-4 text-success"
                      : k.tone === "accent"
                        ? "h-4 w-4 text-accent"
                        : "h-4 w-4 text-primary"
                }
              />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{k.value}</div>
              <p className="text-xs text-muted-foreground">Dados serão populados nas próximas etapas</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Setores */}
      <div>
        <h2 className="text-lg font-semibold">Seus setores</h2>
        <p className="text-sm text-muted-foreground">
          Cada etapa está interligada à próxima no fluxograma produtivo.
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        ) : setoresVisiveis.length === 0 ? (
          <Card className="mt-4">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Você ainda não tem setor atribuído. Aguarde a Diretoria ou o Master liberar seu acesso.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {setoresVisiveis.map((s) => (
              <Link
                key={s.slug}
                to="/app/setor/$setor"
                params={{ setor: s.slug }}
                className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary"
                    style={{ boxShadow: "var(--shadow-glow)" }}
                  >
                    <s.icon className="h-5 w-5" />
                  </div>
                  {s.origem && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      ← {s.origem}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-sm font-semibold group-hover:text-primary">{s.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.descricao}</p>
                {s.destino && (
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-accent">
                    Próximo → {s.destino}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
