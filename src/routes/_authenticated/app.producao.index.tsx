import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Factory, Plus, FileText, Timer, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  SUB_SETORES,
  SUB_SETOR_MAP,
  APONTAMENTO_STATUS_LABEL,
  APONTAMENTO_STATUS_TONE,
  podeGerirProducao,
  type SetorProducao,
  type ApontamentoStatus,
} from "@/lib/producao";
import { abrirDocumentoImpressao, escapeHtml, listaHtml } from "@/lib/print-doc";

export const Route = createFileRoute("/_authenticated/app/producao/")({
  head: () => ({
    meta: [
      { title: "Produção — Aço, Manta, Vidros e Montagem | Solution Place" },
      {
        name: "description",
        content:
          "Apontamentos de produção por etapa de blindagem, com rastreabilidade por colaborador, procedimentos ISO 9001:2015 e dashboard de produtividade.",
      },
      { property: "og:title", content: "Produção — Solution Place" },
      {
        property: "og:description",
        content: "Rastreabilidade por colaborador e produtividade das etapas de blindagem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProducaoPage,
});

type Apontamento = {
  id: string;
  setor: SetorProducao;
  os_id: string | null;
  colaborador_nome: string;
  escopos: string[];
  observacoes: string | null;
  horas: number | null;
  status: ApontamentoStatus;
  data_execucao: string;
  assinatura: string | null;
  assinado_em: string | null;
  os?: { numero: string } | null;
};
type Os = { id: string; numero: string; nivel_blindagem: string | null };
type Colaborador = { id: string; nome: string; setor: string | null };
type Procedimento = {
  id: string;
  codigo: string;
  titulo: string;
  setor: string;
  versao: string;
  clausula_iso: string | null;
  objetivo: string | null;
  passos: unknown;
  riscos: unknown;
  epis: string[] | null;
};

export function imprimirProcedimento(p: Procedimento) {
  const passos = Array.isArray(p.passos) ? (p.passos as unknown[]) : [];
  const riscos = Array.isArray(p.riscos) ? (p.riscos as unknown[]) : [];
  abrirDocumentoImpressao(
    `${p.codigo} — ${p.titulo}`,
    `<h1>${escapeHtml(p.titulo)}</h1>
     <p class="sub">${escapeHtml(p.codigo)} · versão ${escapeHtml(p.versao)} · setor ${escapeHtml(p.setor)} · ISO 9001:2015 ${escapeHtml(p.clausula_iso ?? "")}</p>
     <h2>Objetivo</h2><p>${escapeHtml(p.objetivo ?? "—")}</p>
     <h2>Procedimento (passo a passo)</h2>${listaHtml(passos)}
     <h2>Riscos e cuidados</h2><div class="alerta">${listaHtml(riscos)}</div>
     <h2>EPIs obrigatórios</h2>${listaHtml(p.epis ?? [])}
     <div class="assin"><div>Colaborador (ciência)</div><div>Segurança do Trabalho / Qualidade</div></div>`,
  );
}

function ProducaoPage() {
  const { roles, user, profile } = useCurrentUser();
  const pode = podeGerirProducao(roles);
  const [apts, setApts] = useState<Apontamento[]>([]);
  const [oss, setOss] = useState<Os[]>([]);
  const [colabs, setColabs] = useState<Colaborador[]>([]);
  const [procs, setProcs] = useState<Procedimento[]>([]);

  async function loadAll() {
    const [a, o, c, p] = await Promise.all([
      supabase
        .from("producao_apontamentos")
        .select(
          "id, setor, os_id, colaborador_nome, escopos, observacoes, horas, status, data_execucao, assinatura, assinado_em, os:ordens_servico(numero)",
        )
        .order("data_execucao", { ascending: false })
        .limit(300),
      supabase
        .from("ordens_servico")
        .select("id, numero, nivel_blindagem")
        .order("created_at", { ascending: false }),
      supabase.from("colaboradores").select("id, nome, setor").eq("ativo", true).order("nome"),
      supabase
        .from("procedimentos")
        .select("id, codigo, titulo, setor, versao, clausula_iso, objetivo, passos, riscos, epis")
        .eq("ativo", true),
    ]);
    setApts((a.data as Apontamento[]) ?? []);
    setOss((o.data as Os[]) ?? []);
    setColabs((c.data as Colaborador[]) ?? []);
    setProcs((p.data as Procedimento[]) ?? []);
  }
  useEffect(() => {
    loadAll();
  }, []);

  const kpis = useMemo(() => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    const doMes = apts.filter((a) => a.data_execucao.startsWith(mesAtual));
    const horas = doMes.reduce((s, a) => s + Number(a.horas ?? 0), 0);
    return {
      total: doMes.length,
      horas: horas.toFixed(1),
      prontos: apts.filter((a) => a.status === "pronto_limpeza").length,
      retrabalho: apts.filter((a) => a.status === "retrabalho" || a.status === "reprovado").length,
    };
  }, [apts]);

  const grafico = useMemo(
    () =>
      SUB_SETORES.map((s) => {
        const doSetor = apts.filter((a) => a.setor === s.slug);
        return {
          setor: s.label,
          apontamentos: doSetor.length,
          horas: Number(doSetor.reduce((sum, a) => sum + Number(a.horas ?? 0), 0).toFixed(1)),
        };
      }),
    [apts],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Factory className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Produção</h1>
          <p className="text-sm text-muted-foreground">
            Aço, manta, vidros, montagem e limpeza/envelopamento — apontamento com identificação do
            colaborador e rastreabilidade.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi
          label="Apontamentos no mês"
          value={kpis.total}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <Kpi
          label="Horas apontadas no mês"
          value={kpis.horas}
          icon={<Timer className="h-4 w-4" />}
        />
        <Kpi label="Prontos p/ limpeza" value={kpis.prontos} />
        <Kpi
          label="Reprovas / retrabalho"
          value={kpis.retrabalho}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Produtividade por etapa (Lean)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={grafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="setor"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <RTooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="apontamentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="horas" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="aco">
        <TabsList className="flex-wrap">
          {SUB_SETORES.map((s) => (
            <TabsTrigger key={s.slug} value={s.slug}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SUB_SETORES.map((s) => (
          <TabsContent key={s.slug} value={s.slug} className="mt-4">
            <SubSetorPanel
              slug={s.slug}
              apts={apts.filter((a) => a.setor === s.slug)}
              oss={oss}
              colabs={colabs}
              proc={procs.find((p) => p.codigo === s.procedimento) ?? null}
              pode={pode}
              userId={user?.id ?? null}
              meuNome={profile?.nome ?? ""}
              reload={loadAll}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function SubSetorPanel({
  slug,
  apts,
  oss,
  colabs,
  proc,
  pode,
  userId,
  meuNome,
  reload,
}: {
  slug: SetorProducao;
  apts: Apontamento[];
  oss: Os[];
  colabs: Colaborador[];
  proc: Procedimento | null;
  pode: boolean;
  userId: string | null;
  meuNome: string;
  reload: () => void;
}) {
  const def = SUB_SETOR_MAP[slug];
  const [open, setOpen] = useState(false);
  const [osId, setOsId] = useState("");
  const [colaborador, setColaborador] = useState("");
  const [escopos, setEscopos] = useState<string[]>([]);
  const [obs, setObs] = useState("");
  const [horas, setHoras] = useState("");
  const [status, setStatus] = useState<ApontamentoStatus>("concluido");
  const [assinatura, setAssinatura] = useState("");
  const [saving, setSaving] = useState(false);

  function toggle(e: string) {
    setEscopos((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function salvar() {
    if (!colaborador.trim()) {
      toast.error("Informe o colaborador responsável.");
      return;
    }
    if (!assinatura.trim()) {
      toast.error("Assine com seu nome completo para rastreabilidade.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("producao_apontamentos").insert({
      setor: slug,
      os_id: osId || null,
      colaborador_nome: colaborador.trim(),
      escopos,
      observacoes: obs || null,
      horas: horas ? Number(horas) : null,
      status,
      assinatura: assinatura.trim(),
      assinado_em: new Date().toISOString(),
      created_by: userId,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Apontamento registrado.");
    setOpen(false);
    setEscopos([]);
    setObs("");
    setHoras("");
    setAssinatura("");
    setOsId("");
    setColaborador("");
    reload();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base">{def.label}</CardTitle>
            <p className="text-sm text-muted-foreground">{def.descricao}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {proc && (
              <Button variant="outline" size="sm" onClick={() => imprimirProcedimento(proc)}>
                <FileText className="mr-2 h-4 w-4" />
                PDF riscos e cuidados ({proc.codigo})
              </Button>
            )}
            {pode && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setAssinatura(meuNome)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo apontamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Apontamento — {def.label}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Ordem de Serviço</Label>
                        <Select value={osId} onValueChange={setOsId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a OS" />
                          </SelectTrigger>
                          <SelectContent>
                            {oss.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.numero}
                                {o.nivel_blindagem ? ` · ${o.nivel_blindagem}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Colaborador responsável</Label>
                        {colabs.length > 0 ? (
                          <Select value={colaborador} onValueChange={setColaborador}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {colabs.map((c) => (
                                <SelectItem key={c.id} value={c.nome}>
                                  {c.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={colaborador}
                            onChange={(e) => setColaborador(e.target.value)}
                            placeholder="Nome do colaborador"
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Escopo executado</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {def.escopos.map((e) => (
                          <label
                            key={e}
                            className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                          >
                            <Checkbox
                              checked={escopos.includes(e)}
                              onCheckedChange={() => toggle(e)}
                            />
                            {e}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Horas gastas</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={horas}
                          onChange={(e) => setHoras(e.target.value)}
                          placeholder="Ex.: 6.5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={status}
                          onValueChange={(v) => setStatus(v as ApontamentoStatus)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(APONTAMENTO_STATUS_LABEL).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea
                        value={obs}
                        onChange={(e) => setObs(e.target.value)}
                        rows={3}
                        placeholder="Ocorrências, desvios, materiais utilizados, pendências..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Assinatura do colaborador (nome completo)</Label>
                      <Input
                        value={assinatura}
                        onChange={(e) => setAssinatura(e.target.value)}
                        placeholder="Assino ciente dos riscos e do procedimento"
                      />
                      <p className="text-xs text-muted-foreground">
                        Ao assinar, você declara ciência do procedimento {proc?.codigo ?? "ISO"} e
                        dos riscos e cuidados da etapa.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={salvar} disabled={saving}>
                      {saving ? "Salvando..." : "Registrar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(a.data_execucao).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{a.os?.numero ?? "—"}</TableCell>
                  <TableCell>{a.colaborador_nome}</TableCell>
                  <TableCell className="max-w-[280px] text-xs">
                    {a.escopos?.join(", ") || "—"}
                  </TableCell>
                  <TableCell>{a.horas ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={APONTAMENTO_STATUS_TONE[a.status]}>
                      {APONTAMENTO_STATUS_LABEL[a.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {apts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Nenhum apontamento nesta etapa.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
