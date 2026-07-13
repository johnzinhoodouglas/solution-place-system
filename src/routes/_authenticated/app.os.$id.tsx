import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftCircle,
  CheckCircle2,
  MessageSquarePlus,
  Pause,
  Play,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ETAPA_LABEL,
  ETAPAS_ORDEM,
  EVENTO_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  etapaAnterior,
  proximaEtapa,
  type OsEtapa,
  type OsEvento,
  type OsStatus,
} from "@/lib/os";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/_authenticated/app/os/$id")({
  component: OsDetailPage,
  notFoundComponent: () => (
    <div className="text-center">
      <h2 className="text-lg font-semibold">OS não encontrada</h2>
      <Button asChild className="mt-3">
        <Link to="/app/os">Voltar</Link>
      </Button>
    </div>
  ),
});

type OsFull = {
  id: string;
  numero: string;
  etapa_atual: OsEtapa;
  status: OsStatus;
  prioridade: string;
  nivel_blindagem: string | null;
  data_entrada: string;
  data_prevista_entrega: string | null;
  data_saida: string | null;
  observacoes: string | null;
  veiculo: {
    placa: string;
    marca: string;
    modelo: string;
    ano: number | null;
    cor: string | null;
    chassi: string | null;
    cliente_nome: string;
    cliente_documento: string | null;
    cliente_contato: string | null;
  } | null;
};

type TimelineRow = {
  id: string;
  evento: OsEvento;
  etapa_de: OsEtapa | null;
  etapa_para: OsEtapa | null;
  descricao: string | null;
  autor_nome: string | null;
  created_at: string;
};

function OsDetailPage() {
  const { id } = Route.useParams();
  const { profile, roles } = useCurrentUser();
  const [os, setOs] = useState<OsFull | null>(null);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  const podeIntervir = roles.includes("master") || roles.includes("diretoria");
  const podeMover =
    podeIntervir ||
    roles.some((r) =>
      ["recepcao", "engenharia", "producao", "qualidade"].includes(r),
    );

  async function load() {
    setBusy(true);
    const [{ data: osData, error }, { data: tlData }] = await Promise.all([
      supabase
        .from("ordens_servico")
        .select(
          "id, numero, etapa_atual, status, prioridade, nivel_blindagem, data_entrada, data_prevista_entrega, data_saida, observacoes, veiculo:veiculos(*)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("os_timeline")
        .select("*")
        .eq("os_id", id)
        .order("created_at", { ascending: false }),
    ]);
    if (error || !osData) {
      setNotFoundState(true);
    } else {
      setOs(osData as OsFull);
      setTimeline((tlData as TimelineRow[]) ?? []);
    }
    setBusy(false);
  }

  useEffect(() => {
    load();
    // realtime updates
    const ch = supabase
      .channel(`os-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "os_timeline", filter: `os_id=eq.${id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ordens_servico", filter: `id=eq.${id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (notFoundState) throw notFound();
  if (busy || !os) return <p className="text-sm text-muted-foreground">Carregando OS...</p>;

  async function mover(target: OsEtapa) {
    if (!os) return;
    const updates: Record<string, unknown> = { etapa_atual: target };
    if (target === "concluida") {
      updates.status = "concluida";
      updates.data_saida = new Date().toISOString();
    } else if (os.status === "aberta") {
      updates.status = "em_andamento";
    }
    const { error } = await supabase.from("ordens_servico").update(updates).eq("id", os.id);
    if (error) toast.error("Erro ao mover etapa", { description: error.message });
    else toast.success(`Etapa atualizada: ${ETAPA_LABEL[target]}`);
  }

  async function mudarStatus(status: OsStatus) {
    if (!os) return;
    const { error } = await supabase.from("ordens_servico").update({ status }).eq("id", os.id);
    if (error) toast.error("Erro", { description: error.message });
    else toast.success(`Status: ${STATUS_LABEL[status]}`);
  }

  async function addNota() {
    if (!nota.trim() || !os) return;
    const { error } = await supabase.from("os_timeline").insert({
      os_id: os.id,
      evento: podeIntervir ? "intervencao_diretoria" : "nota",
      descricao: nota.trim(),
      autor_nome: profile?.nome ?? null,
    });
    if (error) toast.error("Erro ao adicionar nota", { description: error.message });
    else {
      toast.success("Nota adicionada");
      setNota("");
    }
  }

  const prox = proximaEtapa(os.etapa_atual);
  const ant = etapaAnterior(os.etapa_atual);
  const idxAtual = ETAPAS_ORDEM.indexOf(os.etapa_atual);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link to="/app/os">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-mono text-2xl font-bold">{os.numero}</h1>
            <p className="text-sm text-muted-foreground">
              {os.veiculo?.marca} {os.veiculo?.modelo} · {os.veiculo?.placa} ·{" "}
              {os.veiculo?.cliente_nome}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={STATUS_TONE[os.status]}>
            {STATUS_LABEL[os.status]}
          </Badge>
          {podeIntervir && (
            <Badge variant="secondary" className="border-accent/40 bg-accent/10 text-accent">
              Modo intervenção
            </Badge>
          )}
        </div>
      </div>

      {/* Progresso das etapas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progresso da produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {ETAPAS_ORDEM.filter((e) => e !== "concluida").map((e, i) => {
              const done = i < idxAtual;
              const atual = e === os.etapa_atual;
              return (
                <div key={e} className="flex items-center gap-2">
                  <div
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                      atual
                        ? "border-primary bg-primary/15 text-primary"
                        : done
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {ETAPA_LABEL[e]}
                  </div>
                  {i < ETAPAS_ORDEM.length - 2 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>

          {podeMover && os.status !== "concluida" && os.status !== "cancelada" && (
            <div className="mt-5 flex flex-wrap gap-2">
              {ant && (
                <Button variant="outline" size="sm" onClick={() => mover(ant)}>
                  <ArrowLeftCircle className="mr-2 h-4 w-4" /> Retornar a {ETAPA_LABEL[ant]}
                </Button>
              )}
              {prox && (
                <Button size="sm" onClick={() => mover(prox)}>
                  Avançar para {ETAPA_LABEL[prox]} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {os.etapa_atual === "entrega" && (
                <Button size="sm" variant="default" onClick={() => mover("concluida")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como entregue
                </Button>
              )}
              {os.status === "em_andamento" || os.status === "aberta" ? (
                <Button size="sm" variant="ghost" onClick={() => mudarStatus("pausada")}>
                  <Pause className="mr-2 h-4 w-4" /> Pausar
                </Button>
              ) : os.status === "pausada" ? (
                <Button size="sm" variant="ghost" onClick={() => mudarStatus("em_andamento")}>
                  <Play className="mr-2 h-4 w-4" /> Retomar
                </Button>
              ) : null}
              {podeIntervir && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => mudarStatus("cancelada")}
                >
                  <X className="mr-2 h-4 w-4" /> Cancelar OS
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Dados da OS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="Nível de blindagem" v={os.nivel_blindagem} />
            <Info
              label="Entrada"
              v={new Date(os.data_entrada).toLocaleString("pt-BR")}
            />
            <Info
              label="Previsão de entrega"
              v={
                os.data_prevista_entrega
                  ? new Date(os.data_prevista_entrega).toLocaleDateString("pt-BR")
                  : null
              }
            />
            <Info
              label="Saída"
              v={
                os.data_saida
                  ? new Date(os.data_saida).toLocaleString("pt-BR")
                  : null
              }
            />
            <Separator />
            <Info label="Veículo" v={`${os.veiculo?.marca} ${os.veiculo?.modelo}`} />
            <Info label="Placa" v={os.veiculo?.placa ?? null} />
            <Info label="Ano" v={os.veiculo?.ano?.toString() ?? null} />
            <Info label="Cor" v={os.veiculo?.cor ?? null} />
            <Info label="Chassi" v={os.veiculo?.chassi ?? null} />
            <Separator />
            <Info label="Cliente" v={os.veiculo?.cliente_nome ?? null} />
            <Info label="Documento" v={os.veiculo?.cliente_documento ?? null} />
            <Info label="Contato" v={os.veiculo?.cliente_contato ?? null} />
            {os.observacoes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Observações
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{os.observacoes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Linha do tempo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder={
                  podeIntervir
                    ? "Registro de intervenção da Diretoria..."
                    : "Adicionar nota, ocorrência ou observação..."
                }
                rows={2}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={addNota} disabled={!nota.trim()}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" /> Registrar
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              {timeline.map((t) => (
                <div
                  key={t.id}
                  className="rounded-md border border-border/60 bg-background/40 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline" className="border-primary/40 text-primary">
                      {EVENTO_LABEL[t.evento]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {t.descricao && (
                    <p className="mt-2 whitespace-pre-wrap text-sm">{t.descricao}</p>
                  )}
                  {t.autor_nome && (
                    <p className="mt-1 text-xs text-muted-foreground">por {t.autor_nome}</p>
                  )}
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem eventos.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, v }: { label: string; v: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm">{v ?? "—"}</p>
    </div>
  );
}
