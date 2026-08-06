import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Plus, Lightbulb, Leaf, AlertTriangle } from "lucide-react";

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
import { SUGESTAO_STATUS_LABEL, SUGESTAO_STATUS_TONE, type SugestaoStatus } from "@/lib/producao";
import { podeGerirQualidade } from "@/lib/qsms";

export const Route = createFileRoute("/_authenticated/app/melhoria/")({
  head: () => ({
    meta: [
      { title: "Melhoria Contínua e Lean — Caixa de Sugestões | Solution Place" },
      {
        name: "description",
        content:
          "Caixa de sugestões analítica com score de impacto, esforço e risco, ganhos estimados e registro de economia (Lean) no sistema ISO 9001:2015.",
      },
      { property: "og:title", content: "Melhoria Contínua e Lean — Solution Place" },
      {
        property: "og:description",
        content: "Sugestões analíticas, PDCA e economia gerada pela digitalização dos processos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MelhoriaPage,
});

type Sugestao = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  setor: string | null;
  autor_nome: string | null;
  autor_id: string | null;
  ganho_tempo_min: number;
  ganho_custo_mes: number;
  ganho_papel_folhas: number;
  nota_impacto: number;
  nota_esforco: number;
  nota_risco: number;
  score: number;
  status: SugestaoStatus;
  parecer: string | null;
  created_at: string;
};
type Economia = {
  id: string;
  item: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_evitado: number;
  mes: string;
  origem: string | null;
};

const CATEGORIAS = [
  "processo",
  "qualidade",
  "seguranca",
  "custo",
  "prazo",
  "papel_zero",
  "ergonomia",
  "cliente",
];

function MelhoriaPage() {
  const { roles, user, profile } = useCurrentUser();
  const podeAvaliar = podeGerirQualidade(roles);
  const [sugs, setSugs] = useState<Sugestao[]>([]);
  const [econ, setEcon] = useState<Economia[]>([]);

  async function loadAll() {
    const [s, e] = await Promise.all([
      supabase.from("sugestoes_melhoria").select("*").order("score", { ascending: false }),
      supabase.from("economia_registros").select("*").order("mes", { ascending: false }),
    ]);
    setSugs((s.data as Sugestao[]) ?? []);
    setEcon((e.data as Economia[]) ?? []);
  }
  useEffect(() => {
    loadAll();
  }, []);

  const analitico = useMemo(() => {
    const ganhoMes = sugs
      .filter((s) => s.status === "implantada")
      .reduce((sum, s) => sum + Number(s.ganho_custo_mes), 0);
    const potencial = sugs
      .filter((s) => s.status !== "implantada" && s.status !== "recusada")
      .reduce((sum, s) => sum + Number(s.ganho_custo_mes), 0);
    const horas = sugs.reduce((sum, s) => sum + Number(s.ganho_tempo_min), 0) / 60;
    const folhas = sugs.reduce((sum, s) => sum + Number(s.ganho_papel_folhas), 0);
    const economia = econ.reduce((sum, e) => sum + Number(e.custo_evitado), 0);
    return { ganhoMes, potencial, horas, folhas, economia };
  }, [sugs, econ]);

  const duplicadas = useMemo(() => {
    const mapa = new Map<string, Sugestao[]>();
    for (const s of sugs) {
      const chave = s.titulo
        .toLowerCase()
        .replace(/[^a-z0-9à-ú ]/g, "")
        .trim()
        .slice(0, 24);
      mapa.set(chave, [...(mapa.get(chave) ?? []), s]);
    }
    return [...mapa.values()].filter((g) => g.length > 1);
  }, [sugs]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Melhoria Contínua (Lean / PDCA)</h1>
          <p className="text-sm text-muted-foreground">
            Caixa de sugestões analítica: cada ideia é pontuada por impacto, esforço, risco e ganho
            estimado.
          </p>
        </div>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-sm">
          <p className="font-semibold">Conceito Lean aplicado</p>
          <p className="mt-1 text-muted-foreground">
            Eliminar desperdícios (espera, retrabalho, movimentação, estoque, papel,
            superprocessamento) enquanto o valor percebido pelo cliente aumenta. Toda sugestão gera
            indicador — o sistema calcula o ganho e prioriza o que entrega mais resultado com menor
            esforço e risco (ISO 9001:2015 — 10.3 Melhoria contínua).
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-5">
        <Kpi
          label="Ganho implantado / mês"
          value={brl(analitico.ganhoMes)}
          icon={<Lightbulb className="h-4 w-4" />}
        />
        <Kpi label="Potencial em análise / mês" value={brl(analitico.potencial)} />
        <Kpi label="Horas economizadas (est.)" value={analitico.horas.toFixed(1)} />
        <Kpi label="Folhas evitadas" value={analitico.folhas} icon={<Leaf className="h-4 w-4" />} />
        <Kpi label="Economia registrada" value={brl(analitico.economia)} />
      </div>

      {duplicadas.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
            <div>
              <p className="font-semibold">Sugestões possivelmente repetidas</p>
              <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                {duplicadas.map((g) => (
                  <li key={g[0]!.id}>
                    {g[0]!.titulo} — {g.length} registros semelhantes
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="sugestoes">
        <TabsList>
          <TabsTrigger value="sugestoes">Caixa de sugestões</TabsTrigger>
          <TabsTrigger value="economia">Economia gerada</TabsTrigger>
        </TabsList>

        <TabsContent value="sugestoes" className="mt-4">
          <SecaoSugestoes
            sugs={sugs}
            podeAvaliar={podeAvaliar}
            userId={user?.id ?? null}
            autor={profile?.nome ?? profile?.email ?? ""}
            reload={loadAll}
          />
        </TabsContent>
        <TabsContent value="economia" className="mt-4">
          <SecaoEconomia econ={econ} reload={loadAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
        <p className="mt-1 text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function SecaoSugestoes({
  sugs,
  podeAvaliar,
  userId,
  autor,
  reload,
}: {
  sugs: Sugestao[];
  podeAvaliar: boolean;
  userId: string | null;
  autor: string;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    categoria: "processo",
    setor: "",
    ganho_tempo_min: "0",
    ganho_custo_mes: "0",
    ganho_papel_folhas: "0",
    nota_impacto: "3",
    nota_esforco: "3",
    nota_risco: "3",
  });
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!form.titulo.trim() || !form.descricao.trim()) {
      toast.error("Informe título e descrição.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("sugestoes_melhoria").insert({
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      setor: form.setor || null,
      autor_id: userId,
      autor_nome: autor || null,
      ganho_tempo_min: Number(form.ganho_tempo_min) || 0,
      ganho_custo_mes: Number(form.ganho_custo_mes) || 0,
      ganho_papel_folhas: Number(form.ganho_papel_folhas) || 0,
      nota_impacto: Number(form.nota_impacto),
      nota_esforco: Number(form.nota_esforco),
      nota_risco: Number(form.nota_risco),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sugestão enviada. Obrigado por contribuir!");
    setOpen(false);
    setForm({
      titulo: "",
      descricao: "",
      categoria: "processo",
      setor: "",
      ganho_tempo_min: "0",
      ganho_custo_mes: "0",
      ganho_papel_folhas: "0",
      nota_impacto: "3",
      nota_esforco: "3",
      nota_risco: "3",
    });
    reload();
  }

  async function mudarStatus(id: string, status: SugestaoStatus) {
    const { error } = await supabase.from("sugestoes_melhoria").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Status atualizado.");
    reload();
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Sugestões priorizadas por score</CardTitle>
          <p className="text-sm text-muted-foreground">
            Score = impacto x2 + (6 − esforço) + (6 − risco) + ganho financeiro + ganho de tempo.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova sugestão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sugestão de melhoria</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição (situação atual e proposta)</Label>
                <Textarea
                  rows={4}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  maxLength={2000}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) => setForm({ ...form, categoria: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Input
                    value={form.setor}
                    onChange={(e) => setForm({ ...form, setor: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Ganho de tempo (min/mês)</Label>
                  <Input
                    type="number"
                    value={form.ganho_tempo_min}
                    onChange={(e) => setForm({ ...form, ganho_tempo_min: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ganho financeiro (R$/mês)</Label>
                  <Input
                    type="number"
                    value={form.ganho_custo_mes}
                    onChange={(e) => setForm({ ...form, ganho_custo_mes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Folhas evitadas/mês</Label>
                  <Input
                    type="number"
                    value={form.ganho_papel_folhas}
                    onChange={(e) => setForm({ ...form, ganho_papel_folhas: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["nota_impacto", "Impacto (1-5)"],
                    ["nota_esforco", "Esforço (1-5)"],
                    ["nota_risco", "Risco (1-5)"],
                  ] as const
                ).map(([k, label]) => (
                  <div className="space-y-2" key={k}>
                    <Label>{label}</Label>
                    <Select value={form[k]} onValueChange={(v) => setForm({ ...form, [k]: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={saving}>
                {saving ? "Enviando..." : "Enviar sugestão"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Score</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Ganho/mês</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sugs.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      Number(s.score) >= 12
                        ? "bg-success/15 text-success border-success/40"
                        : Number(s.score) >= 8
                          ? "bg-primary/15 text-primary border-primary/40"
                          : "bg-muted text-muted-foreground border-border"
                    }
                  >
                    {Number(s.score).toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[320px]">
                  <p className="font-medium">{s.titulo}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{s.descricao}</p>
                </TableCell>
                <TableCell className="text-xs">{s.autor_nome ?? "—"}</TableCell>
                <TableCell className="text-xs capitalize">
                  {s.categoria.replace("_", " ")}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {brl(Number(s.ganho_custo_mes))}
                </TableCell>
                <TableCell>
                  {podeAvaliar ? (
                    <Select
                      value={s.status}
                      onValueChange={(v) => mudarStatus(s.id, v as SugestaoStatus)}
                    >
                      <SelectTrigger className="h-8 w-[170px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SUGESTAO_STATUS_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={SUGESTAO_STATUS_TONE[s.status]}>
                      {SUGESTAO_STATUS_LABEL[s.status]}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {sugs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Nenhuma sugestão registrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SecaoEconomia({ econ, reload }: { econ: Economia[]; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    item: "",
    categoria: "papel",
    quantidade: "0",
    unidade: "un",
    custo_unitario: "0",
    origem: "",
  });
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!form.item.trim()) {
      toast.error("Informe o item.");
      return;
    }
    setSaving(true);
    const qtd = Number(form.quantidade) || 0;
    const cu = Number(form.custo_unitario) || 0;
    const { error } = await supabase.from("economia_registros").insert({
      item: form.item.trim(),
      categoria: form.categoria,
      quantidade: qtd,
      unidade: form.unidade,
      custo_unitario: cu,
      custo_evitado: qtd * cu,
      origem: form.origem || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Economia registrada.");
    setOpen(false);
    setForm({
      item: "",
      categoria: "papel",
      quantidade: "0",
      unidade: "un",
      custo_unitario: "0",
      origem: "",
    });
    reload();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Economia gerada (digitalização e Lean)</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Registrar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registro de economia</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Item economizado</Label>
                <Input
                  value={form.item}
                  onChange={(e) => setForm({ ...form, item: e.target.value })}
                  placeholder="Ex.: impressão de checklist de entrada"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) => setForm({ ...form, categoria: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "papel",
                        "retrabalho",
                        "material",
                        "hora_extra",
                        "energia",
                        "logistica",
                      ].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input
                    value={form.unidade}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo unitário (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.custo_unitario}
                    onChange={(e) => setForm({ ...form, custo_unitario: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Origem</Label>
                <Input
                  value={form.origem}
                  onChange={(e) => setForm({ ...form, origem: e.target.value })}
                  placeholder="Setor ou sugestão de origem"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Qtd.</TableHead>
              <TableHead>Custo evitado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {econ.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(e.mes).toLocaleDateString("pt-BR", {
                    month: "2-digit",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>{e.item}</TableCell>
                <TableCell className="text-xs capitalize">
                  {e.categoria.replace("_", " ")}
                </TableCell>
                <TableCell>
                  {Number(e.quantidade)} {e.unidade}
                </TableCell>
                <TableCell>{brl(Number(e.custo_evitado))}</TableCell>
              </TableRow>
            ))}
            {econ.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhum registro de economia.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
