import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardCheck, Plus, FileText, Upload, X } from "lucide-react";

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
import { podeGerirQualidade } from "@/lib/qsms";
import {
  CHECKLIST_PADRAO,
  INSPECAO_TIPO_LABEL,
  INSPECAO_RESULTADO_LABEL,
  INSPECAO_RESULTADO_TONE,
  type InspecaoTipo,
  type InspecaoResultado,
} from "@/lib/producao";
import { abrirDocumentoImpressao, escapeHtml } from "@/lib/print-doc";
import {
  comprimirImagem,
  formatarBytes,
  nomeSeguroArquivo,
  validarArquivoImagem,
  TAMANHO_MAX_MB,
} from "@/lib/image-upload";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/app/qualidade/inspecoes")({
  head: () => ({
    meta: [
      { title: "Inspeções da Qualidade — Recebimento, Entrada e Saída | Solution Place" },
      {
        name: "description",
        content:
          "Inspeção de recebimento de materiais e checklist fotográfico de entrada e saída de veículos blindados, com relatório de inspeção em PDF.",
      },
      { property: "og:title", content: "Inspeções da Qualidade — Solution Place" },
      {
        property: "og:description",
        content: "Checklists fotográficos e relatórios de inspeção conforme ISO 9001:2015.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InspecoesPage,
});

type ChecklistItem = { item: string; ok: boolean | null; obs?: string };
type Foto = { path: string; nome: string };
type Inspecao = {
  id: string;
  numero: string | null;
  tipo: InspecaoTipo;
  resultado: InspecaoResultado;
  data_inspecao: string;
  inspetor_nome: string | null;
  observacoes: string | null;
  km: number | null;
  combustivel: string | null;
  itens_recebidos: string | null;
  checklist: unknown;
  fotos: unknown;
  os_id: string | null;
  os?: { numero: string; veiculo?: { placa: string; marca: string; modelo: string } | null } | null;
  fornecedor?: { nome: string } | null;
};
type Os = { id: string; numero: string; veiculo_id: string };
type Fornecedor = { id: string; nome: string };

function InspecoesPage() {
  const { roles, user, profile } = useCurrentUser();
  const pode = podeGerirQualidade(roles) || roles.includes("recepcao") || roles.includes("compras");
  const [insp, setInsp] = useState<Inspecao[]>([]);
  const [oss, setOss] = useState<Os[]>([]);
  const [forns, setForns] = useState<Fornecedor[]>([]);
  const [tab, setTab] = useState<InspecaoTipo>("entrada");

  async function loadAll() {
    const [i, o, f] = await Promise.all([
      supabase
        .from("inspecoes")
        .select(
          "id, numero, tipo, resultado, data_inspecao, inspetor_nome, observacoes, km, combustivel, itens_recebidos, checklist, fotos, os_id, os:ordens_servico(numero, veiculo:veiculos(placa, marca, modelo)), fornecedor:fornecedores(nome)",
        )
        .order("data_inspecao", { ascending: false })
        .limit(300),
      supabase
        .from("ordens_servico")
        .select("id, numero, veiculo_id")
        .order("created_at", { ascending: false }),
      supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
    ]);
    setInsp((i.data as Inspecao[]) ?? []);
    setOss((o.data as Os[]) ?? []);
    setForns((f.data as Fornecedor[]) ?? []);
  }
  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Inspeções da Qualidade</h1>
          <p className="text-sm text-muted-foreground">
            Recebimento de materiais, entrada e saída de veículos — checklist com fotos e relatório
            em PDF (ISO 9001:2015, 8.4/8.6).
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as InspecaoTipo)}>
        <TabsList className="flex-wrap">
          {(Object.keys(INSPECAO_TIPO_LABEL) as InspecaoTipo[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {INSPECAO_TIPO_LABEL[t]}
            </TabsTrigger>
          ))}
        </TabsList>
        {(Object.keys(INSPECAO_TIPO_LABEL) as InspecaoTipo[]).map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            <Painel
              tipo={t}
              lista={insp.filter((i) => i.tipo === t)}
              oss={oss}
              forns={forns}
              pode={pode}
              userId={user?.id ?? null}
              inspetor={profile?.nome ?? profile?.email ?? ""}
              reload={loadAll}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

async function assinarFotos(fotos: Foto[]) {
  const urls: { nome: string; url: string }[] = [];
  for (const f of fotos) {
    const { data } = await supabase.storage.from("inspecoes").createSignedUrl(f.path, 3600);
    if (data?.signedUrl) urls.push({ nome: f.nome, url: data.signedUrl });
  }
  return urls;
}

async function imprimirRelatorio(i: Inspecao) {
  const checklist = (Array.isArray(i.checklist) ? i.checklist : []) as ChecklistItem[];
  const fotos = (Array.isArray(i.fotos) ? i.fotos : []) as Foto[];
  const urls = await assinarFotos(fotos);
  const veic = i.os?.veiculo;
  abrirDocumentoImpressao(
    `Relatório de Inspeção ${i.numero ?? ""}`,
    `<h1>Relatório de Inspeção — ${escapeHtml(INSPECAO_TIPO_LABEL[i.tipo])}</h1>
     <p class="sub">${escapeHtml(i.numero ?? "")} · ${new Date(i.data_inspecao).toLocaleString("pt-BR")}</p>
     <h2>Identificação</h2>
     <div class="grid">
       <p class="kv"><b>OS:</b> ${escapeHtml(i.os?.numero ?? "—")}</p>
       <p class="kv"><b>Veículo:</b> ${escapeHtml(veic ? `${veic.marca} ${veic.modelo} — ${veic.placa}` : "—")}</p>
       <p class="kv"><b>Fornecedor:</b> ${escapeHtml(i.fornecedor?.nome ?? "—")}</p>
       <p class="kv"><b>Inspetor:</b> ${escapeHtml(i.inspetor_nome ?? "—")}</p>
       <p class="kv"><b>KM:</b> ${escapeHtml(i.km ?? "—")}</p>
       <p class="kv"><b>Combustível:</b> ${escapeHtml(i.combustivel ?? "—")}</p>
       <p class="kv"><b>Resultado:</b> ${escapeHtml(INSPECAO_RESULTADO_LABEL[i.resultado])}</p>
     </div>
     ${i.itens_recebidos ? `<h2>Itens recebidos / pertences</h2><p>${escapeHtml(i.itens_recebidos)}</p>` : ""}
     <h2>Checklist</h2>
     <table><thead><tr><th>Item</th><th style="width:90px">Situação</th><th style="width:35%">Observação</th></tr></thead><tbody>
     ${checklist.map((c) => `<tr><td>${escapeHtml(c.item)}</td><td>${c.ok === true ? "Conforme" : c.ok === false ? "Não conforme" : "N/A"}</td><td>${escapeHtml(c.obs ?? "")}</td></tr>`).join("")}
     </tbody></table>
     <h2>Observações gerais</h2><p>${escapeHtml(i.observacoes ?? "—")}</p>
     ${urls.length ? `<h2>Evidências fotográficas</h2><div class="fotos">${urls.map((u) => `<div><img src="${u.url}" alt="${escapeHtml(u.nome)}" /><p class="sub">${escapeHtml(u.nome)}</p></div>`).join("")}</div>` : ""}
     <div class="assin"><div>Inspetor da Qualidade</div><div>Cliente / Responsável</div></div>`,
  );
}

function Painel({
  tipo,
  lista,
  oss,
  forns,
  pode,
  userId,
  inspetor,
  reload,
}: {
  tipo: InspecaoTipo;
  lista: Inspecao[];
  oss: Os[];
  forns: Fornecedor[];
  pode: boolean;
  userId: string | null;
  inspetor: string;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [osId, setOsId] = useState("");
  const [fornId, setFornId] = useState("");
  const [km, setKm] = useState("");
  const [comb, setComb] = useState("");
  const [itens, setItens] = useState("");
  const [obs, setObs] = useState("");
  const [resultado, setResultado] = useState<InspecaoResultado>("aprovado");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    CHECKLIST_PADRAO[tipo].map((item) => ({ item, ok: true, obs: "" })),
  );
  const [arquivos, setArquivos] = useState<{ file: File; originalBytes: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [progresso, setProgresso] = useState<{ atual: number; total: number; nome: string } | null>(
    null,
  );

  async function selecionarArquivos(files: File[]) {
    if (files.length === 0) return;
    setPreparando(true);
    const aceitos: { file: File; originalBytes: number }[] = [];
    for (const file of files) {
      const erro = validarArquivoImagem(file);
      if (erro) {
        toast.error(erro);
        continue;
      }
      const comprimido = await comprimirImagem(file);
      aceitos.push({ file: comprimido, originalBytes: file.size });
    }
    setPreparando(false);
    if (aceitos.length === 0) return;
    setArquivos((prev) => [
      ...prev,
      ...aceitos.filter((a) => !prev.some((p) => p.file.name === a.file.name)),
    ]);
    const antes = aceitos.reduce((s, a) => s + a.originalBytes, 0);
    const depois = aceitos.reduce((s, a) => s + a.file.size, 0);
    toast.success(
      depois < antes
        ? `${aceitos.length} foto(s) prontas — ${formatarBytes(antes)} reduzidas para ${formatarBytes(depois)}.`
        : `${aceitos.length} foto(s) prontas (${formatarBytes(depois)}).`,
    );
  }

  function reset() {
    setOsId("");
    setFornId("");
    setKm("");
    setComb("");
    setItens("");
    setObs("");
    setResultado("aprovado");
    setChecklist(CHECKLIST_PADRAO[tipo].map((item) => ({ item, ok: true, obs: "" })));
    setArquivos([]);
  }

  async function salvar() {
    setSaving(true);
    const fotos: Foto[] = [];
    for (let idx = 0; idx < arquivos.length; idx++) {
      const { file } = arquivos[idx];
      setProgresso({ atual: idx, total: arquivos.length, nome: file.name });
      const path = `${tipo}/${Date.now()}-${nomeSeguroArquivo(file.name)}`;
      const { error } = await supabase.storage
        .from("inspecoes")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (error) {
        const msg = /size|large|exceed/i.test(error.message)
          ? `"${file.name}" excede o tamanho permitido pelo armazenamento (limite ${TAMANHO_MAX_MB} MB).`
          : `Não foi possível enviar "${file.name}": ${error.message}`;
        toast.error(msg);
        setProgresso(null);
        setSaving(false);
        return;
      }
      fotos.push({ path, nome: file.name });
    }
    setProgresso(
      arquivos.length > 0 ? { atual: arquivos.length, total: arquivos.length, nome: "" } : null,
    );
    const { error } = await supabase.from("inspecoes").insert({
      tipo,
      os_id: osId || null,
      fornecedor_id: fornId || null,
      inspetor_id: userId,
      inspetor_nome: inspetor || null,
      km: km ? Number(km) : null,
      combustivel: comb || null,
      itens_recebidos: itens || null,
      observacoes: obs || null,
      resultado,
      checklist: checklist as unknown as never,
      fotos: fotos as unknown as never,
      created_by: userId,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Inspeção registrada.");
    setOpen(false);
    reset();
    reload();
  }

  const naoConformes = checklist.filter((c) => c.ok === false).length;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">{INSPECAO_TIPO_LABEL[tipo]}</CardTitle>
          <p className="text-sm text-muted-foreground">{lista.length} registro(s)</p>
        </div>
        {pode && (
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) reset();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova inspeção
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{INSPECAO_TIPO_LABEL[tipo]}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {tipo === "recebimento" ? (
                    <div className="space-y-2">
                      <Label>Fornecedor</Label>
                      <Select value={fornId} onValueChange={setFornId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {forns.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
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
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {tipo !== "recebimento" && (
                    <>
                      <div className="space-y-2">
                        <Label>KM</Label>
                        <Input type="number" value={km} onChange={(e) => setKm(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Combustível</Label>
                        <Input
                          value={comb}
                          onChange={(e) => setComb(e.target.value)}
                          placeholder="Ex.: 1/2 tanque"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    {tipo === "recebimento"
                      ? "Itens recebidos (material, lote, qtd.)"
                      : "Itens e pertences do cliente"}
                  </Label>
                  <Textarea value={itens} onChange={(e) => setItens(e.target.value)} rows={2} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Checklist</Label>
                    {naoConformes > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-destructive/15 text-destructive border-destructive/40"
                      >
                        {naoConformes} não conforme(s)
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {checklist.map((c, idx) => (
                      <div
                        key={c.item}
                        className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
                      >
                        <span className="text-sm">{c.item}</span>
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={c.ok === true}
                            onCheckedChange={(v) =>
                              setChecklist((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, ok: v === true } : p)),
                              )
                            }
                          />
                          Conforme
                        </label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="Observação"
                          value={c.obs ?? ""}
                          onChange={(e) =>
                            setChecklist((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, obs: e.target.value } : p)),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fotos do checklist</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      multiple
                      disabled={preparando || saving}
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        e.target.value = "";
                        void selecionarArquivos(files);
                      }}
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG ou WebP até {TAMANHO_MAX_MB} MB por foto. As imagens são reduzidas
                    automaticamente antes do envio.
                  </p>
                  {preparando && (
                    <p className="text-xs text-primary">Preparando e comprimindo as fotos…</p>
                  )}
                  {arquivos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {arquivos.map((f) => (
                        <Badge key={f.file.name} variant="outline" className="gap-1">
                          {f.file.name} · {formatarBytes(f.file.size)}
                          <button
                            type="button"
                            aria-label={`Remover ${f.file.name}`}
                            onClick={() => setArquivos((prev) => prev.filter((x) => x !== f))}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {progresso && progresso.total > 0 && (
                    <div className="space-y-1">
                      <Progress value={(progresso.atual / progresso.total) * 100} />
                      <p className="text-xs text-muted-foreground">
                        Enviando {Math.min(progresso.atual + 1, progresso.total)} de{" "}
                        {progresso.total}
                        {progresso.nome ? ` — ${progresso.nome}` : ""}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Resultado</Label>
                    <Select
                      value={resultado}
                      onValueChange={(v) => setResultado(v as InspecaoResultado)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(INSPECAO_RESULTADO_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Inspetor</Label>
                    <Input value={inspetor} disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações gerais</Label>
                  <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={salvar} disabled={saving}>
                  {saving ? "Salvando..." : "Registrar inspeção"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>OS / Fornecedor</TableHead>
              <TableHead>Inspetor</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead className="text-right">Relatório</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.numero}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {new Date(i.data_inspecao).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>{i.os?.numero ?? i.fornecedor?.nome ?? "—"}</TableCell>
                <TableCell>{i.inspetor_nome ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={INSPECAO_RESULTADO_TONE[i.resultado]}>
                    {INSPECAO_RESULTADO_LABEL[i.resultado]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => imprimirRelatorio(i)}>
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {lista.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Nenhuma inspeção registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
