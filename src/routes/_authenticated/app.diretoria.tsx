import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlarmClock, AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/lib/use-current-user";
import { podeIntervir } from "@/lib/setores";
import { NC_SEV_LABEL, NC_STATUS_LABEL, type NcSeveridade, type NcStatus } from "@/lib/qsms";
import { INSPECAO_TIPO_LABEL } from "@/lib/producao";

export const Route = createFileRoute("/_authenticated/app/diretoria")({
  head: () => ({
    meta: [
      { title: "Painel de Prazos da Diretoria | Solution Place" },
      { name: "description", content: "Prazos pendentes de NCs, ações corretivas e inspeções com alertas de escalonamento." },
      { property: "og:title", content: "Painel de Prazos da Diretoria — Solution Place" },
      { property: "og:description", content: "Alertas de NCs e inspeções vencendo ou vencidas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiretoriaPage,
});

type Item = {
  id: string;
  tipo: "NC" | "Ação" | "Inspeção";
  ref: string;
  titulo: string;
  prazo: string;
  nivel: number;
  status: string;
  link: { to: string; params?: Record<string, string> };
};

const hoje = () => new Date().toISOString().slice(0, 10);
const dias = (p: string) => Math.round((new Date(p + "T12:00").getTime() - new Date(hoje() + "T12:00").getTime()) / 864e5);

function DiretoriaPage() {
  const { roles, loading } = useCurrentUser();
  const [itens, setItens] = useState<Item[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      const [n, a, i] = await Promise.all([
        supabase
          .from("nao_conformidades")
          .select("id, numero, titulo, prazo, status, severidade, escalonamento_nivel")
          .not("status", "in", "(resolvida,verificada,fechada)")
          .not("prazo", "is", null),
        supabase
          .from("acoes_corretivas")
          .select("id, nc_id, what, when_prazo, status, escalonamento_nivel")
          .in("status", ["planejada", "em_execucao"])
          .not("when_prazo", "is", null),
        supabase
          .from("inspecoes")
          .select("id, numero, tipo, prazo, resultado, escalonamento_nivel")
          .eq("resultado", "pendente")
          .not("prazo", "is", null),
      ]);
      const lista: Item[] = [
        ...(n.data ?? []).map((x) => ({
          id: x.id, tipo: "NC" as const, ref: x.numero, titulo: `${x.titulo} · ${NC_SEV_LABEL[x.severidade as NcSeveridade]}`,
          prazo: x.prazo!, nivel: x.escalonamento_nivel, status: NC_STATUS_LABEL[x.status as NcStatus],
          link: { to: "/app/qualidade/$id", params: { id: x.id } },
        })),
        ...(a.data ?? []).map((x) => ({
          id: x.id, tipo: "Ação" as const, ref: "5W2H", titulo: x.what, prazo: x.when_prazo!, nivel: x.escalonamento_nivel,
          status: x.status === "planejada" ? "Planejada" : "Em execução",
          link: { to: "/app/qualidade/$id", params: { id: x.nc_id } },
        })),
        ...(i.data ?? []).map((x) => ({
          id: x.id, tipo: "Inspeção" as const, ref: x.numero ?? "—",
          titulo: `Inspeção de ${INSPECAO_TIPO_LABEL[x.tipo as keyof typeof INSPECAO_TIPO_LABEL]}`,
          prazo: x.prazo!, nivel: x.escalonamento_nivel, status: "Pendente",
          link: { to: "/app/qualidade/inspecoes" },
        })),
      ].sort((x, y) => x.prazo.localeCompare(y.prazo));
      setItens(lista);
      setBusy(false);
    })();
  }, []);

  const grupos = useMemo(() => {
    const venc = itens.filter((x) => dias(x.prazo) < 0);
    const prox = itens.filter((x) => dias(x.prazo) >= 0 && dias(x.prazo) <= 3);
    const ok = itens.filter((x) => dias(x.prazo) > 3);
    return { venc, prox, ok };
  }, [itens]);

  if (!loading && !podeIntervir(roles))
    return <p className="text-sm text-muted-foreground">Acesso restrito à Diretoria e Master.</p>;

  const kpis = [
    { l: "Vencidos", v: grupos.venc.length, icon: AlertTriangle, c: "text-destructive" },
    { l: "Vencem em até 3 dias", v: grupos.prox.length, icon: AlarmClock, c: "text-warning" },
    { l: "No prazo", v: grupos.ok.length, icon: CheckCircle2, c: "text-success" },
    { l: "Escalonados", v: itens.filter((x) => x.nivel > 0).length, icon: CalendarClock, c: "text-primary" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel de prazos da Diretoria</h1>
        <p className="text-sm text-muted-foreground">
          NCs, ações corretivas e inspeções pendentes. Itens vencidos ou a 3 dias do prazo são escalonados automaticamente aos gestores.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.l}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="text-xs text-muted-foreground">{k.l}</p>
                <p className="text-2xl font-bold">{busy ? "…" : k.v}</p>
              </div>
              <k.icon className={`h-6 w-6 ${k.c}`} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Grupo titulo="Vencidos" itens={grupos.venc} tone="bg-destructive/15 text-destructive border-destructive/40" />
      <Grupo titulo="Vencendo (até 3 dias)" itens={grupos.prox} tone="bg-warning/15 text-warning border-warning/40" />
      <Grupo titulo="Dentro do prazo" itens={grupos.ok} tone="bg-success/15 text-success border-success/40" />
    </div>
  );
}

function Grupo({ titulo, itens, tone }: { titulo: string; itens: Item[]; tone: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {titulo} <Badge variant="outline" className={tone}>{itens.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada aqui.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Ref.</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Escalonamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((x) => {
                const d = dias(x.prazo);
                return (
                  <TableRow key={x.tipo + x.id}>
                    <TableCell><Badge variant="outline">{x.tipo}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link to={x.link.to as never} params={x.link.params as never} className="text-primary hover:underline">{x.ref}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{x.titulo}</TableCell>
                    <TableCell className="text-xs">{x.status}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(x.prazo + "T12:00").toLocaleDateString("pt-BR")}{" "}
                      <span className={d < 0 ? "text-destructive" : "text-muted-foreground"}>
                        ({d < 0 ? `${-d}d atrasado` : d === 0 ? "hoje" : `em ${d}d`})
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{x.nivel > 0 ? `Nível ${x.nivel}` : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
