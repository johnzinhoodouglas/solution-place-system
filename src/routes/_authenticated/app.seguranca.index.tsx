import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HardHat, Plus, ShieldAlert, MessageSquare, PackageOpen } from "lucide-react";

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
import {
  INC_TIPO_LABEL, INC_GRAV_LABEL, INC_GRAV_TONE,
  podeGerirSeguranca, type IncidenteTipo, type IncidenteGravidade,
} from "@/lib/qsms";

export const Route = createFileRoute("/_authenticated/app/seguranca/")({
  component: SegurancaPage,
});

type Epi = { id: string; nome: string; ca: string | null; validade_ca: string | null; tamanho: string | null; estoque: number; estoque_minimo: number; ativo: boolean };
type Entrega = { id: string; epi_id: string; colaborador_nome: string; quantidade: number; data_entrega: string; assinado: boolean; epi?: { nome: string } | null };
type Incidente = { id: string; data_ocorrencia: string; tipo: IncidenteTipo; gravidade: IncidenteGravidade; local: string | null; descricao: string; dias_afastamento: number };
type Dds = { id: string; data: string; tema: string; responsavel_nome: string | null; qtd_participantes: number };

function SegurancaPage() {
  const { roles, user } = useCurrentUser();
  const pode = podeGerirSeguranca(roles);
  const [epis, setEpis] = useState<Epi[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [dds, setDds] = useState<Dds[]>([]);

  async function loadAll() {
    const [e, en, i, d] = await Promise.all([
      supabase.from("epis").select("*").order("nome"),
      supabase.from("entregas_epi").select("id, epi_id, colaborador_nome, quantidade, data_entrega, assinado, epi:epis(nome)").order("data_entrega", { ascending: false }).limit(100),
      supabase.from("incidentes_seguranca").select("id, data_ocorrencia, tipo, gravidade, local, descricao, dias_afastamento").order("data_ocorrencia", { ascending: false }),
      supabase.from("dds").select("id, data, tema, responsavel_nome, qtd_participantes").order("data", { ascending: false }),
    ]);
    setEpis((e.data as Epi[]) ?? []);
    setEntregas((en.data as Entrega[]) ?? []);
    setIncidentes((i.data as Incidente[]) ?? []);
    setDds((d.data as Dds[]) ?? []);
  }
  useEffect(() => { loadAll(); }, []);

  const diasSemAcidente = (() => {
    const ultimo = incidentes.find((i) => i.tipo === "com_afastamento");
    if (!ultimo) return "—";
    const d = Math.floor((Date.now() - new Date(ultimo.data_ocorrencia).getTime()) / 86400000);
    return String(d);
  })();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <HardHat className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Segurança do Trabalho</h1>
            <p className="text-sm text-muted-foreground">EPIs, incidentes e DDS — conformidade com NRs.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="EPIs cadastrados" value={epis.length} icon={<PackageOpen className="h-4 w-4" />} />
        <Kpi label="Entregas (últimas 100)" value={entregas.length} />
        <Kpi label="Incidentes registrados" value={incidentes.length} icon={<ShieldAlert className="h-4 w-4" />} />
        <Kpi label="Dias sem acidente c/ afastamento" value={diasSemAcidente} />
      </div>

      <Tabs defaultValue="epis">
        <TabsList>
          <TabsTrigger value="epis">EPIs</TabsTrigger>
          <TabsTrigger value="entregas">Entregas</TabsTrigger>
          <TabsTrigger value="incidentes">Incidentes</TabsTrigger>
          <TabsTrigger value="dds">DDS</TabsTrigger>
        </TabsList>

        <TabsContent value="epis" className="mt-4">
          <SectionEpis epis={epis} pode={pode} reload={loadAll} />
        </TabsContent>
        <TabsContent value="entregas" className="mt-4">
          <SectionEntregas epis={epis} entregas={entregas} pode={pode} userId={user?.id ?? null} reload={loadAll} />
        </TabsContent>
        <TabsContent value="incidentes" className="mt-4">
          <SectionIncidentes incidentes={incidentes} pode={pode} userId={user?.id ?? null} reload={loadAll} />
        </TabsContent>
        <TabsContent value="dds" className="mt-4">
          <SectionDds dds={dds} pode={pode} reload={loadAll} />
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

/* ============ EPIs ============ */
function SectionEpis({ epis, pode, reload }: { epis: Epi[]; pode: boolean; reload: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Catálogo de EPIs</CardTitle>
        {pode && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Novo EPI</Button></DialogTrigger>
            <EpiForm onSaved={() => { setOpen(false); reload(); }} />
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead><TableHead>CA</TableHead><TableHead>Validade</TableHead>
              <TableHead>Tamanho</TableHead><TableHead>Estoque</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {epis.map((e) => {
              const baixo = e.estoque <= e.estoque_minimo;
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell className="text-xs">{e.ca ?? "—"}</TableCell>
                  <TableCell className="text-xs">{e.validade_ca ? new Date(e.validade_ca).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-xs">{e.tamanho ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={baixo ? "border-destructive/40 bg-destructive/15 text-destructive" : "border-success/40 bg-success/15 text-success"}>
                      {e.estoque} un
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {epis.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhum EPI cadastrado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EpiForm({ onSaved }: { onSaved: () => void }) {
  const [nome, setNome] = useState("");
  const [ca, setCa] = useState("");
  const [validade, setValidade] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [estoque, setEstoque] = useState("0");
  const [minimo, setMinimo] = useState("0");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("epis").insert({
      nome, ca: ca || null, validade_ca: validade || null, tamanho: tamanho || null,
      estoque: Number(estoque) || 0, estoque_minimo: Number(minimo) || 0,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("EPI cadastrado"); onSaved();
  }
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Novo EPI</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Nome *</Label><Input required value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>CA</Label><Input value={ca} onChange={(e) => setCa(e.target.value)} /></div>
          <div><Label>Validade CA</Label><Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} /></div>
          <div><Label>Tamanho</Label><Input value={tamanho} onChange={(e) => setTamanho(e.target.value)} /></div>
          <div><Label>Estoque inicial</Label><Input type="number" value={estoque} onChange={(e) => setEstoque(e.target.value)} /></div>
          <div className="col-span-2"><Label>Estoque mínimo</Label><Input type="number" value={minimo} onChange={(e) => setMinimo(e.target.value)} /></div>
        </div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ============ ENTREGAS ============ */
function SectionEntregas({ epis, entregas, pode, userId, reload }: { epis: Epi[]; entregas: Entrega[]; pode: boolean; userId: string | null; reload: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Entregas de EPI</CardTitle>
        {pode && epis.length > 0 && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Nova entrega</Button></DialogTrigger>
            <EntregaForm epis={epis} userId={userId} onSaved={() => { setOpen(false); reload(); }} />
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Colaborador</TableHead><TableHead>EPI</TableHead>
            <TableHead>Qtd</TableHead><TableHead>Assinado</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {entregas.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{new Date(e.data_entrega).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>{e.colaborador_nome}</TableCell>
                <TableCell className="text-xs">{e.epi?.nome ?? "—"}</TableCell>
                <TableCell>{e.quantidade}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={e.assinado ? "border-success/40 bg-success/15 text-success" : "border-warning/40 bg-warning/15 text-warning"}>
                    {e.assinado ? "Sim" : "Pendente"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {entregas.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhuma entrega.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EntregaForm({ epis, userId, onSaved }: { epis: Epi[]; userId: string | null; onSaved: () => void }) {
  const [epiId, setEpiId] = useState(epis[0]?.id ?? "");
  const [nome, setNome] = useState("");
  const [qtd, setQtd] = useState("1");
  const [assinado, setAssinado] = useState(false);
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("entregas_epi").insert({
      epi_id: epiId, colaborador_nome: nome, quantidade: Number(qtd) || 1,
      assinado, registrado_por: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Entrega registrada"); onSaved();
  }
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Registrar entrega de EPI</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>EPI</Label>
          <Select value={epiId} onValueChange={setEpiId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {epis.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome} ({e.estoque} em estoque)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Colaborador *</Label><Input required value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div><Label>Quantidade</Label><Input type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={assinado} onChange={(e) => setAssinado(e.target.checked)} />
          Termo assinado pelo colaborador
        </label>
        <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ============ INCIDENTES ============ */
const TIPOS: IncidenteTipo[] = ["quase_acidente","primeiros_socorros","sem_afastamento","com_afastamento","ambiental","patrimonial"];
const GRAVIDADES: IncidenteGravidade[] = ["leve","moderada","grave","gravissima"];

function SectionIncidentes({ incidentes, pode, userId, reload }: { incidentes: Incidente[]; pode: boolean; userId: string | null; reload: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Incidentes de segurança</CardTitle>
        {pode && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Registrar</Button></DialogTrigger>
            <IncidenteForm userId={userId} onSaved={() => { setOpen(false); reload(); }} />
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {incidentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum incidente.</p>
        ) : incidentes.map((i) => (
          <div key={i.id} className="rounded-lg border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={INC_GRAV_TONE[i.gravidade]}>{INC_GRAV_LABEL[i.gravidade]}</Badge>
                <span className="font-medium">{INC_TIPO_LABEL[i.tipo]}</span>
                {i.dias_afastamento > 0 && <Badge variant="outline">Afastamento: {i.dias_afastamento}d</Badge>}
              </div>
              <span className="text-xs text-muted-foreground">{new Date(i.data_ocorrencia).toLocaleString("pt-BR")}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{i.descricao}</p>
            {i.local && <p className="mt-1 text-xs text-muted-foreground">Local: {i.local}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function IncidenteForm({ userId, onSaved }: { userId: string | null; onSaved: () => void }) {
  const [tipo, setTipo] = useState<IncidenteTipo>("quase_acidente");
  const [gravidade, setGravidade] = useState<IncidenteGravidade>("leve");
  const [descricao, setDescricao] = useState("");
  const [local, setLocal] = useState("");
  const [dias, setDias] = useState("0");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("incidentes_seguranca").insert({
      tipo, gravidade, descricao, local: local || null,
      dias_afastamento: Number(dias) || 0, registrado_por: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Incidente registrado"); onSaved();
  }
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Registrar incidente</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as IncidenteTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{INC_TIPO_LABEL[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Gravidade</Label>
            <Select value={gravidade} onValueChange={(v) => setGravidade(v as IncidenteGravidade)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GRAVIDADES.map((g) => <SelectItem key={g} value={g}>{INC_GRAV_LABEL[g]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Descrição *</Label><Textarea required rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Local</Label><Input value={local} onChange={(e) => setLocal(e.target.value)} /></div>
          <div><Label>Dias de afastamento</Label><Input type="number" min={0} value={dias} onChange={(e) => setDias(e.target.value)} /></div>
        </div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ============ DDS ============ */
function SectionDds({ dds, pode, reload }: { dds: Dds[]; pode: boolean; reload: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Diálogo Diário de Segurança (DDS)</CardTitle>
        {pode && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Novo DDS</Button></DialogTrigger>
            <DdsForm onSaved={() => { setOpen(false); reload(); }} />
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {dds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum DDS registrado.</p>
        ) : dds.map((d) => (
          <div key={d.id} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
            <MessageSquare className="mt-1 h-4 w-4 text-primary" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{d.tema}</p>
                <span className="text-xs text-muted-foreground">{new Date(d.data).toLocaleDateString("pt-BR")}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Responsável: {d.responsavel_nome ?? "—"} · {d.qtd_participantes} participantes
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DdsForm({ onSaved }: { onSaved: () => void }) {
  const [tema, setTema] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [resp, setResp] = useState("");
  const [qtd, setQtd] = useState("0");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("dds").insert({
      tema, conteudo: conteudo || null,
      responsavel_nome: resp || null, qtd_participantes: Number(qtd) || 0,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("DDS registrado"); onSaved();
  }
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Novo DDS</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Tema *</Label><Input required value={tema} onChange={(e) => setTema(e.target.value)} /></div>
        <div><Label>Conteúdo</Label><Textarea rows={3} value={conteudo} onChange={(e) => setConteudo(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Responsável</Label><Input value={resp} onChange={(e) => setResp(e.target.value)} /></div>
          <div><Label>Nº participantes</Label><Input type="number" min={0} value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>
        </div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
