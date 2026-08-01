import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Plus, GraduationCap } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/use-current-user";
import { TREINAMENTO_TIPO_LABEL, podeGerirRh, type TreinamentoTipo } from "@/lib/producao";
import { SETORES } from "@/lib/setores";

export const Route = createFileRoute("/_authenticated/app/rh/")({
  head: () => ({
    meta: [
      { title: "Recursos Humanos — Colaboradores e Treinamentos | Solution Place" },
      { name: "description", content: "Cadastro de colaboradores, matriz de treinamentos de liderança, gestão pessoal, técnicos e segurança, com registro de presença e certificação (ISO 9001:2015 — 7.2)." },
      { property: "og:title", content: "Recursos Humanos — Solution Place" },
      { property: "og:description", content: "Colaboradores, competências e treinamentos conforme ISO 9001:2015." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RhPage,
});

type Colaborador = {
  id: string; nome: string; matricula: string | null; setor: string | null; cargo: string | null;
  data_admissao: string | null; email: string | null; telefone: string | null; ativo: boolean;
};
type Treinamento = {
  id: string; titulo: string; tipo: TreinamentoTipo; setor: string | null; descricao: string | null;
  carga_horaria: number; instrutor: string | null; data_prevista: string | null;
  data_realizada: string | null; obrigatorio: boolean;
};
type Participante = {
  id: string; treinamento_id: string; colaborador_nome: string; presente: boolean;
  nota: number | null; certificado: boolean;
};

function RhPage() {
  const { roles } = useCurrentUser();
  const pode = podeGerirRh(roles);
  const [colabs, setColabs] = useState<Colaborador[]>([]);
  const [treinos, setTreinos] = useState<Treinamento[]>([]);
  const [parts, setParts] = useState<Participante[]>([]);

  async function loadAll() {
    const [c, t, p] = await Promise.all([
      supabase.from("colaboradores").select("*").order("nome"),
      supabase.from("treinamentos").select("*").order("titulo"),
      supabase.from("treinamento_participantes").select("*").order("colaborador_nome"),
    ]);
    setColabs((c.data as Colaborador[]) ?? []);
    setTreinos((t.data as Treinamento[]) ?? []);
    setParts((p.data as Participante[]) ?? []);
  }
  useEffect(() => { loadAll(); }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Recursos Humanos</h1>
          <p className="text-sm text-muted-foreground">
            Dados de colaboradores e treinamentos — competência e conscientização (ISO 9001:2015, 7.2 e 7.3).
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Colaboradores ativos" value={colabs.filter((c) => c.ativo).length} />
        <Kpi label="Treinamentos cadastrados" value={treinos.length} icon={<GraduationCap className="h-4 w-4" />} />
        <Kpi label="Participações registradas" value={parts.length} />
        <Kpi label="Certificados emitidos" value={parts.filter((p) => p.certificado).length} />
      </div>

      <Tabs defaultValue="colaboradores">
        <TabsList>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="colaboradores" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Quadro de colaboradores</CardTitle>
              {pode && <NovoColaborador reload={loadAll} />}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colabs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="text-xs">{c.matricula ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.setor ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.cargo ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {c.data_admissao ? new Date(c.data_admissao).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={c.ativo ? "bg-success/15 text-success border-success/40" : "bg-muted text-muted-foreground border-border"}>
                          {c.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {colabs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        Nenhum colaborador cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treinamentos" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Matriz de treinamentos</CardTitle>
              {pode && <NovoTreinamento reload={loadAll} />}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Treinamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Carga</TableHead>
                    <TableHead>Realizado</TableHead>
                    <TableHead>Participantes</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treinos.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="font-medium">{t.titulo}</p>
                        {t.obrigatorio && <span className="text-[10px] uppercase text-warning">obrigatório</span>}
                      </TableCell>
                      <TableCell className="text-xs">{TREINAMENTO_TIPO_LABEL[t.tipo]}</TableCell>
                      <TableCell className="text-xs">{Number(t.carga_horaria)}h</TableCell>
                      <TableCell className="text-xs">
                        {t.data_realizada ? new Date(t.data_realizada).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {parts.filter((p) => p.treinamento_id === t.id).length}
                      </TableCell>
                      <TableCell className="text-right">
                        {pode && (
                          <AddParticipante treinamentoId={t.id} colabs={colabs} reload={loadAll} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {treinos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        Nenhum treinamento cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
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

function NovoColaborador({ reload }: { reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ nome: "", matricula: "", setor: "", cargo: "", data_admissao: "", email: "", telefone: "", observacoes: "" });
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!f.nome.trim()) { toast.error("Informe o nome."); return; }
    setSaving(true);
    const { error } = await supabase.from("colaboradores").insert({
      nome: f.nome.trim(),
      matricula: f.matricula || null,
      setor: f.setor || null,
      cargo: f.cargo || null,
      data_admissao: f.data_admissao || null,
      email: f.email || null,
      telefone: f.telefone || null,
      observacoes: f.observacoes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Colaborador cadastrado.");
    setOpen(false);
    setF({ nome: "", matricula: "", setor: "", cargo: "", data_admissao: "", email: "", telefone: "", observacoes: "" });
    reload();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo colaborador</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Novo colaborador</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nome completo</Label>
            <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label>Matrícula</Label>
            <Input value={f.matricula} onChange={(e) => setF({ ...f, matricula: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Setor</Label>
            <Select value={f.setor} onValueChange={(v) => setF({ ...f, setor: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {SETORES.map((s) => <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Input value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Admissão</Label>
            <Input type="date" value={f.data_admissao} onChange={(e) => setF({ ...f, data_admissao: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} maxLength={30} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoTreinamento({ reload }: { reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ titulo: "", tipo: "tecnico" as TreinamentoTipo, setor: "", carga_horaria: "4", instrutor: "", data_prevista: "", data_realizada: "", descricao: "" });
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!f.titulo.trim()) { toast.error("Informe o título."); return; }
    setSaving(true);
    const { error } = await supabase.from("treinamentos").insert({
      titulo: f.titulo.trim(),
      tipo: f.tipo,
      setor: f.setor || null,
      carga_horaria: Number(f.carga_horaria) || 1,
      instrutor: f.instrutor || null,
      data_prevista: f.data_prevista || null,
      data_realizada: f.data_realizada || null,
      descricao: f.descricao || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Treinamento cadastrado.");
    setOpen(false);
    reload();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo treinamento</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Novo treinamento</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Título</Label>
            <Input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} maxLength={140} />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as TreinamentoTipo })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TREINAMENTO_TIPO_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Carga horária</Label>
            <Input type="number" step="0.5" value={f.carga_horaria} onChange={(e) => setF({ ...f, carga_horaria: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Instrutor</Label>
            <Input value={f.instrutor} onChange={(e) => setF({ ...f, instrutor: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Setor</Label>
            <Input value={f.setor} onChange={(e) => setF({ ...f, setor: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Data prevista</Label>
            <Input type="date" value={f.data_prevista} onChange={(e) => setF({ ...f, data_prevista: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Data realizada</Label>
            <Input type="date" value={f.data_realizada} onChange={(e) => setF({ ...f, data_realizada: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Conteúdo / descrição</Label>
            <Textarea rows={3} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddParticipante({
  treinamentoId, colabs, reload,
}: { treinamentoId: string; colabs: Colaborador[]; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [colabId, setColabId] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    const c = colabs.find((x) => x.id === colabId);
    if (!c) { toast.error("Selecione o colaborador."); return; }
    setSaving(true);
    const { error } = await supabase.from("treinamento_participantes").insert({
      treinamento_id: treinamentoId,
      colaborador_id: c.id,
      colaborador_nome: c.nome,
      presente: true,
      nota: nota ? Number(nota) : null,
      certificado: nota ? Number(nota) >= 7 : false,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Participação registrada.");
    setOpen(false); setColabId(""); setNota(""); reload();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Registrar presença</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Participação em treinamento</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Colaborador</Label>
            <Select value={colabId} onValueChange={setColabId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {colabs.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nota de avaliação (0-10)</Label>
            <Input type="number" min="0" max="10" step="0.1" value={nota} onChange={(e) => setNota(e.target.value)} />
            <p className="text-xs text-muted-foreground">Certificado emitido automaticamente com nota ≥ 7.</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
