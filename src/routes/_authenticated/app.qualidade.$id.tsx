import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Plus,
  ShieldCheck,
  Sparkles,
  Send,
  Check,
  RotateCcw,
  Upload,
  X,
  Lock,
  History,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  NC_ORIGEM_LABEL,
  NC_SEV_LABEL,
  NC_SEV_TONE,
  NC_STATUS_LABEL,
  NC_STATUS_TONE,
  ACAO_STATUS_LABEL,
  ACAO_STATUS_TONE,
  APROV_LABEL,
  APROV_TONE,
  DECISAO_LABEL,
  podeGerirQualidade,
  type NcSeveridade,
  type NcStatus,
  type AcaoStatus,
} from "@/lib/qsms";
import { analisarNc, type AnaliseIa } from "@/lib/nc-ai.functions";
import { comprimirImagem, nomeSeguroArquivo, validarArquivoImagem } from "@/lib/image-upload";

export const Route = createFileRoute("/_authenticated/app/qualidade/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da Não Conformidade | Solution Place" },
      {
        name: "description",
        content: "Análise de causa, ações corretivas, aprovação da Diretoria e histórico da NC.",
      },
      { property: "og:title", content: "Não Conformidade — Solution Place" },
      { property: "og:description", content: "Tratamento de NC conforme ISO 9001:2015." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NcDetail,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-xl font-semibold">Erro</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <p>NC não encontrada.</p>,
});

type Evidencia = { texto?: string; path?: string; nome?: string };
type Nc = {
  id: string;
  numero: string;
  titulo: string;
  descricao: string | null;
  origem: string;
  severidade: NcSeveridade;
  status: NcStatus;
  setor: string | null;
  data_abertura: string;
  data_fechamento: string | null;
  prazo: string | null;
  responsavel_id: string | null;
  evidencias: unknown;
  analise_ia: unknown;
};
type Acao = {
  id: string;
  what: string;
  why: string | null;
  who: string | null;
  when_prazo: string | null;
  where_local: string | null;
  how_como: string | null;
  how_much: number | null;
  status: AcaoStatus;
  aprovacao_status: string;
};
type Decisao = {
  id: string;
  acao_id: string | null;
  decisao: string;
  comentario: string | null;
  autor_nome: string | null;
  created_at: string;
};
type Perfil = { id: string; nome: string | null; email: string };

const STATUS_LIST: NcStatus[] = ["aberta", "em_analise", "em_acao", "resolvida", "verificada"];
const ACAO_STATUS_LIST: AcaoStatus[] = [
  "planejada",
  "em_execucao",
  "concluida",
  "verificada",
  "cancelada",
];

function NcDetail() {
  const { id } = Route.useParams();
  const { roles, user } = useCurrentUser();
  const qualidade = podeGerirQualidade(roles);
  const gestor = roles.includes("diretoria") || roles.includes("master");
  const [nc, setNc] = useState<Nc | null>(null);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [decisoes, setDecisoes] = useState<Decisao[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [openAcao, setOpenAcao] = useState(false);
  const [preset, setPreset] = useState<Partial<Acao> | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const analisar = useServerFn(analisarNc);

  async function load() {
    const [{ data: n }, { data: a }, { data: d }, { data: p }] = await Promise.all([
      supabase.from("nao_conformidades").select("*").eq("id", id).maybeSingle(),
      supabase.from("acoes_corretivas").select("*").eq("nc_id", id).order("created_at"),
      supabase.from("nc_decisoes").select("*").eq("nc_id", id).order("created_at"),
      supabase.from("profiles").select("id, nome, email").eq("ativo", true).order("nome"),
    ]);
    setNc((n as Nc | null) ?? null);
    setAcoes((a as Acao[]) ?? []);
    setDecisoes((d as Decisao[]) ?? []);
    setPerfis((p as Perfil[]) ?? []);
  }
  useEffect(() => {
    load();
  }, [id]);

  if (!nc) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const responsavel = !!user && nc.responsavel_id === user.id;
  const podeEditar = qualidade || responsavel;
  const fechada = nc.status === "fechada";
  const evidencias = (Array.isArray(nc.evidencias) ? nc.evidencias : []) as Evidencia[];
  const analise = nc.analise_ia as AnaliseIa | null;
  const vencida =
    !!nc.prazo && !fechada && new Date(nc.prazo + "T23:59:59") < new Date();

  async function patchNc(patch: Record<string, unknown>, ok = "Atualizado") {
    const { error } = await supabase.from("nao_conformidades").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(ok);
    load();
  }

  async function decidir(decisao: string, acaoId: string | null, comentario = "") {
    const { error } = await supabase.rpc("registrar_decisao", {
      _nc: id,
      _acao: acaoId as string,
      _decisao: decisao,
      _comentario: comentario,
    });
    if (error) return toast.error(error.message);
    toast.success(DECISAO_LABEL[decisao] ?? "Registrado");
    load();
  }

  async function rodarIa() {
    setAnalisando(true);
    try {
      await analisar({ data: { ncId: id } });
      toast.success("Análise concluída");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na análise");
    } finally {
      setAnalisando(false);
    }
  }

  const nomePerfil = (uid: string | null) => {
    const p = perfis.find((x) => x.id === uid);
    return p ? (p.nome ?? p.email) : "—";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/qualidade">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Link>
          </Button>
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-mono text-xl font-bold">{nc.numero}</h1>
            <p className="text-sm text-muted-foreground">{nc.titulo}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {vencida && (
            <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/40">
              Prazo vencido
            </Badge>
          )}
          <Badge variant="outline" className={NC_SEV_TONE[nc.severidade]}>
            {NC_SEV_LABEL[nc.severidade]}
          </Badge>
          <Badge variant="outline" className={NC_STATUS_TONE[nc.status]}>
            {NC_STATUS_LABEL[nc.status]}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <Label className="text-xs">Origem</Label>
            <p>{NC_ORIGEM_LABEL[nc.origem as keyof typeof NC_ORIGEM_LABEL]}</p>
          </div>
          <div>
            <Label className="text-xs">Setor</Label>
            <p>{nc.setor ?? "—"}</p>
          </div>
          <div>
            <Label className="text-xs">Aberta em</Label>
            <p>{new Date(nc.data_abertura).toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <Label className="text-xs">Fechada em</Label>
            <p>{nc.data_fechamento ? new Date(nc.data_fechamento).toLocaleString("pt-BR") : "—"}</p>
          </div>
          <div>
            <Label className="text-xs">Responsável</Label>
            {qualidade && !fechada ? (
              <Select
                value={nc.responsavel_id ?? ""}
                onValueChange={(v) => patchNc({ responsavel_id: v }, "Responsável definido")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Definir responsável" />
                </SelectTrigger>
                <SelectContent>
                  {perfis.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome ?? p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p>{nomePerfil(nc.responsavel_id)}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Prazo de tratamento</Label>
            {qualidade && !fechada ? (
              <Input
                type="date"
                defaultValue={nc.prazo ?? ""}
                onBlur={(e) =>
                  e.target.value !== (nc.prazo ?? "") &&
                  patchNc({ prazo: e.target.value || null, escalonamento_nivel: 0 }, "Prazo atualizado")
                }
              />
            ) : (
              <p>{nc.prazo ? new Date(nc.prazo + "T12:00").toLocaleDateString("pt-BR") : "—"}</p>
            )}
          </div>
          {qualidade && !fechada && (
            <div className="sm:col-span-2">
              <Label className="text-xs">Status</Label>
              <Select value={nc.status} onValueChange={(v) => patchNc({ status: v }, "Status atualizado")}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_LIST.map((s) => (
                    <SelectItem key={s} value={s}>
                      {NC_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <DescricaoEvidencias
        nc={nc}
        evidencias={evidencias}
        podeEditar={podeEditar && !fechada}
        onSaved={load}
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Análise de causa com IA
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Causas prováveis (6M) e sugestões de ações corretivas a partir da descrição e das
              evidências. Revise antes de adotar.
            </p>
          </div>
          {podeEditar && !fechada && (
            <Button size="sm" onClick={rodarIa} disabled={analisando}>
              <Sparkles className="mr-2 h-4 w-4" />
              {analisando ? "Analisando..." : analise ? "Refazer análise" : "Analisar com IA"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!analise ? (
            <p className="text-muted-foreground">
              {analisando
                ? "A IA está analisando a NC. Isso pode levar alguns instantes…"
                : "Nenhuma análise gerada ainda. Preencha a descrição e as evidências e clique em Analisar."}
            </p>
          ) : (
            <>
              <p>{analise.resumo}</p>
              <div>
                <p className="mb-2 font-medium">Causas prováveis</p>
                <div className="space-y-2">
                  {analise.causas.map((c, i) => (
                    <div key={i} className="rounded-md border border-border p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.causa}</span>
                        <Badge variant="outline">{c.categoria}</Badge>
                        <Badge variant="outline">Probabilidade {c.probabilidade}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.justificativa}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 font-medium">Ações corretivas sugeridas</p>
                <div className="space-y-2">
                  {analise.acoes.map((a, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 rounded-md border border-border p-2">
                      <div>
                        <p className="font-medium">{a.what}</p>
                        <p className="text-xs text-muted-foreground">
                          <b>Por quê:</b> {a.why} · <b>Como:</b> {a.how} · <b>Quem:</b>{" "}
                          {a.responsavel_sugerido} · <b>Prazo:</b> {a.prazo_dias} dias
                        </p>
                      </div>
                      {podeEditar && !fechada && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + Math.round(a.prazo_dias || 7));
                            setPreset({
                              what: a.what,
                              why: a.why,
                              how_como: a.how,
                              who: a.responsavel_sugerido,
                              when_prazo: d.toISOString().slice(0, 10),
                            });
                            setOpenAcao(true);
                          }}
                        >
                          <Plus className="mr-1 h-3 w-3" /> Usar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {analise.gerado_em && (
                <p className="text-xs text-muted-foreground">
                  Gerado em {new Date(analise.gerado_em).toLocaleString("pt-BR")}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Ações corretivas (5W2H) e aprovação</CardTitle>
          {podeEditar && !fechada && (
            <Dialog
              open={openAcao}
              onOpenChange={(o) => {
                setOpenAcao(o);
                if (!o) setPreset(null);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Nova ação
                </Button>
              </DialogTrigger>
              {openAcao && (
                <AcaoForm
                  ncId={id}
                  userId={user?.id ?? null}
                  preset={preset}
                  onSaved={() => {
                    setOpenAcao(false);
                    setPreset(null);
                    load();
                  }}
                />
              )}
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {acoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>
          ) : (
            acoes.map((a) => (
              <AcaoCard
                key={a.id}
                a={a}
                podeEditar={podeEditar && !fechada}
                gestor={gestor && !fechada}
                onStatus={async (s) => {
                  const { error } = await supabase
                    .from("acoes_corretivas")
                    .update({ status: s })
                    .eq("id", a.id);
                  if (error) toast.error(error.message);
                  load();
                }}
                decidir={decidir}
              />
            ))
          )}

          {gestor && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
              {fechada ? (
                <Button variant="outline" onClick={() => decidir("reaberta", null, "Reaberta pela Diretoria")}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reabrir NC
                </Button>
              ) : (
                <ConcluirNc
                  pendentes={acoes.filter((x) => x.aprovacao_status !== "aprovada" && x.status !== "cancelada").length}
                  total={acoes.length}
                  onConfirm={(c) => decidir("concluida", null, c)}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Histórico de decisões
          </CardTitle>
        </CardHeader>
        <CardContent>
          {decisoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma decisão registrada.</p>
          ) : (
            <ol className="space-y-3 border-l border-border pl-4">
              {decisoes.map((d) => {
                const acao = acoes.find((x) => x.id === d.acao_id);
                return (
                  <li key={d.id} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={APROV_TONE[d.decisao] ?? ""}>
                        {DECISAO_LABEL[d.decisao] ?? d.decisao}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {d.autor_nome ?? "—"} · {new Date(d.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {acao && <p className="mt-1 text-xs">Ação: {acao.what}</p>}
                    {d.comentario && (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                        “{d.comentario}”
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DescricaoEvidencias({
  nc,
  evidencias,
  podeEditar,
  onSaved,
}: {
  nc: Nc;
  evidencias: Evidencia[];
  podeEditar: boolean;
  onSaved: () => void;
}) {
  const [descricao, setDescricao] = useState(nc.descricao ?? "");
  const [novaEv, setNovaEv] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    setDescricao(nc.descricao ?? "");
  }, [nc.descricao]);

  useEffect(() => {
    (async () => {
      const m: Record<string, string> = {};
      for (const e of evidencias.filter((x) => x.path)) {
        const { data } = await supabase.storage.from("inspecoes").createSignedUrl(e.path!, 3600);
        if (data?.signedUrl) m[e.path!] = data.signedUrl;
      }
      setUrls(m);
    })();
  }, [nc.evidencias]);

  async function salvarEv(lista: Evidencia[], extra: Record<string, unknown> = {}) {
    const { error } = await supabase
      .from("nao_conformidades")
      .update({ evidencias: lista as never, ...extra })
      .eq("id", nc.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    onSaved();
    return true;
  }

  async function enviarFotos(files: File[]) {
    setEnviando(true);
    const novas: Evidencia[] = [];
    for (const f of files) {
      const erro = validarArquivoImagem(f);
      if (erro) {
        toast.error(erro);
        continue;
      }
      const file = await comprimirImagem(f);
      const path = `nc/${nc.id}/${Date.now()}-${nomeSeguroArquivo(file.name)}`;
      const { error } = await supabase.storage
        .from("inspecoes")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (error) {
        toast.error(`Não foi possível enviar "${f.name}": ${error.message}`);
        continue;
      }
      novas.push({ path, nome: file.name });
    }
    if (novas.length && (await salvarEv([...evidencias, ...novas])))
      toast.success(`${novas.length} foto(s) anexada(s)`);
    setEnviando(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Descrição e evidências</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {podeEditar ? (
          <div className="space-y-2">
            <Label>Descrição detalhada do problema</Label>
            <Textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            <Button
              size="sm"
              variant="outline"
              disabled={descricao === (nc.descricao ?? "")}
              onClick={async () => {
                if (await salvarEv(evidencias, { descricao: descricao || null }))
                  toast.success("Descrição salva");
              }}
            >
              Salvar descrição
            </Button>
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{nc.descricao ?? "—"}</p>
        )}

        <div className="space-y-2">
          <Label>Evidências</Label>
          {evidencias.length === 0 && <p className="text-muted-foreground">Nenhuma evidência.</p>}
          <ul className="space-y-1">
            {evidencias
              .map((e, i) => ({ e, i }))
              .filter(({ e }) => e.texto)
              .map(({ e, i }) => (
                <li key={i} className="flex items-start justify-between gap-2 rounded border border-border p-2">
                  <span>{e.texto}</span>
                  {podeEditar && (
                    <button
                      aria-label="Remover evidência"
                      onClick={() => salvarEv(evidencias.filter((_, j) => j !== i))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </li>
              ))}
          </ul>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {evidencias
              .map((e, i) => ({ e, i }))
              .filter(({ e }) => e.path)
              .map(({ e, i }) => (
                <div key={i} className="relative">
                  {urls[e.path!] ? (
                    <img src={urls[e.path!]} alt={e.nome ?? "Evidência"} className="aspect-square w-full rounded border border-border object-cover" />
                  ) : (
                    <div className="aspect-square w-full rounded border border-border bg-muted" />
                  )}
                  {podeEditar && (
                    <button
                      aria-label="Remover foto"
                      className="absolute right-1 top-1 rounded bg-background/80 p-1"
                      onClick={() => salvarEv(evidencias.filter((_, j) => j !== i))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
          </div>
          {podeEditar && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex.: medição da manta 2 mm abaixo do especificado"
                  value={novaEv}
                  onChange={(e) => setNovaEv(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!novaEv.trim()}
                  onClick={async () => {
                    if (await salvarEv([...evidencias, { texto: novaEv.trim() }])) setNovaEv("");
                  }}
                >
                  Adicionar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  disabled={enviando}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    void enviarFotos(files);
                  }}
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {enviando && <p className="text-xs text-primary">Enviando fotos…</p>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AcaoCard({
  a,
  podeEditar,
  gestor,
  onStatus,
  decidir,
}: {
  a: Acao;
  podeEditar: boolean;
  gestor: boolean;
  onStatus: (s: AcaoStatus) => void;
  decidir: (d: string, acaoId: string | null, c?: string) => Promise<unknown>;
}) {
  const [ajuste, setAjuste] = useState("");
  const [openAjuste, setOpenAjuste] = useState(false);
  const podeEnviar = podeEditar && (a.aprovacao_status === "rascunho" || a.aprovacao_status === "ajustes");

  return (
    <div className="rounded-lg border border-border p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-medium">{a.what}</p>
        <div className="flex gap-2">
          <Badge variant="outline" className={APROV_TONE[a.aprovacao_status] ?? ""}>
            {APROV_LABEL[a.aprovacao_status] ?? a.aprovacao_status}
          </Badge>
          <Badge variant="outline" className={ACAO_STATUS_TONE[a.status]}>
            {ACAO_STATUS_LABEL[a.status]}
          </Badge>
        </div>
      </div>
      <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        {a.why && <p><b>Por quê:</b> {a.why}</p>}
        {a.where_local && <p><b>Onde:</b> {a.where_local}</p>}
        {a.how_como && <p><b>Como:</b> {a.how_como}</p>}
        {a.when_prazo && (
          <p><b>Prazo:</b> {new Date(a.when_prazo + "T12:00").toLocaleDateString("pt-BR")}</p>
        )}
        {a.how_much !== null && <p><b>Custo:</b> R$ {Number(a.how_much).toFixed(2)}</p>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {podeEditar && (
          <Select value={a.status} onValueChange={(v) => onStatus(v as AcaoStatus)}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACAO_STATUS_LIST.map((s) => (
                <SelectItem key={s} value={s}>
                  {ACAO_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {podeEnviar && (
          <Button size="sm" variant="outline" onClick={() => decidir("enviada", a.id)}>
            <Send className="mr-1 h-3 w-3" /> Enviar para aprovação
          </Button>
        )}
        {gestor && a.aprovacao_status === "enviada" && (
          <>
            <Button size="sm" onClick={() => decidir("aprovada", a.id, "")}>
              <Check className="mr-1 h-3 w-3" /> Aprovar
            </Button>
            <Dialog open={openAjuste} onOpenChange={setOpenAjuste}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <RotateCcw className="mr-1 h-3 w-3" /> Solicitar ajustes
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar ajustes</DialogTitle>
                </DialogHeader>
                <Textarea
                  rows={4}
                  placeholder="Descreva o que precisa ser ajustado"
                  value={ajuste}
                  onChange={(e) => setAjuste(e.target.value)}
                />
                <DialogFooter>
                  <Button
                    disabled={!ajuste.trim()}
                    onClick={async () => {
                      await decidir("ajustes", a.id, ajuste);
                      setOpenAjuste(false);
                      setAjuste("");
                    }}
                  >
                    Enviar solicitação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}

function ConcluirNc({
  pendentes,
  total,
  onConfirm,
}: {
  pendentes: number;
  total: number;
  onConfirm: (c: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [c, setC] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Lock className="mr-2 h-4 w-4" /> Concluir NC
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir não conformidade</DialogTitle>
        </DialogHeader>
        {total === 0 ? (
          <p className="text-sm text-warning">Nenhuma ação corretiva foi registrada.</p>
        ) : pendentes > 0 ? (
          <p className="text-sm text-warning">
            {pendentes} ação(ões) ainda não aprovada(s). Você pode concluir mesmo assim.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Todas as ações foram aprovadas.</p>
        )}
        <Textarea
          rows={3}
          placeholder="Parecer final da Diretoria (eficácia, lições aprendidas)"
          value={c}
          onChange={(e) => setC(e.target.value)}
        />
        <DialogFooter>
          <Button
            onClick={async () => {
              await onConfirm(c);
              setOpen(false);
            }}
          >
            Confirmar conclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AcaoForm({
  ncId,
  userId,
  preset,
  onSaved,
}: {
  ncId: string;
  userId: string | null;
  preset: Partial<Acao> | null;
  onSaved: () => void;
}) {
  const [what, setWhat] = useState(preset?.what ?? "");
  const [why, setWhy] = useState(preset?.why ?? "");
  const [who, setWho] = useState(preset?.who ?? "");
  const [whereLocal, setWhereLocal] = useState("");
  const [howComo, setHowComo] = useState(preset?.how_como ?? "");
  const [howMuch, setHowMuch] = useState("");
  const [when, setWhen] = useState(preset?.when_prazo ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("acoes_corretivas").insert({
      nc_id: ncId,
      what,
      why: why || null,
      observacoes: who ? `Responsável sugerido: ${who}` : null,
      where_local: whereLocal || null,
      how_como: howComo || null,
      how_much: howMuch ? Number(howMuch) : null,
      when_prazo: when || null,
      created_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Ação registrada como rascunho");
    onSaved();
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Nova ação corretiva (5W2H)</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>O quê *</Label>
          <Textarea required rows={2} value={what} onChange={(e) => setWhat(e.target.value)} />
        </div>
        <div>
          <Label>Por quê</Label>
          <Textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quem (responsável sugerido)</Label>
            <Input value={who} onChange={(e) => setWho(e.target.value)} />
          </div>
          <div>
            <Label>Onde</Label>
            <Input value={whereLocal} onChange={(e) => setWhereLocal(e.target.value)} />
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div>
            <Label>Custo (R$)</Label>
            <Input type="number" step="0.01" value={howMuch} onChange={(e) => setHowMuch(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Como</Label>
          <Textarea rows={2} value={howComo} onChange={(e) => setHowComo(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Registrar ação"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
