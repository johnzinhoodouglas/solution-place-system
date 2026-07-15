import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, ShieldCheck } from "lucide-react";

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
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  NC_ORIGEM_LABEL, NC_SEV_LABEL, NC_SEV_TONE, NC_STATUS_LABEL, NC_STATUS_TONE,
  ACAO_STATUS_LABEL, ACAO_STATUS_TONE,
  podeGerirQualidade, type NcSeveridade, type NcStatus, type AcaoStatus,
} from "@/lib/qsms";

export const Route = createFileRoute("/_authenticated/app/qualidade/$id")({
  component: NcDetail,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-xl font-semibold">Erro</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <p>NC não encontrada.</p>,
});

type Nc = {
  id: string; numero: string; titulo: string; descricao: string | null;
  origem: string; severidade: NcSeveridade; status: NcStatus;
  setor: string | null; data_abertura: string; data_fechamento: string | null;
};
type Acao = {
  id: string; nc_id: string; what: string; why: string | null;
  who: string | null; when_prazo: string | null; where_local: string | null;
  how_como: string | null; how_much: number | null;
  status: AcaoStatus; eficacia_verificada: boolean;
};

const STATUS_LIST: NcStatus[] = ["aberta","em_analise","em_acao","resolvida","verificada","fechada"];
const ACAO_STATUS_LIST: AcaoStatus[] = ["planejada","em_execucao","concluida","verificada","cancelada"];

function NcDetail() {
  const { id } = Route.useParams();
  const { roles } = useCurrentUser();
  const pode = podeGerirQualidade(roles);
  const [nc, setNc] = useState<Nc | null>(null);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [openAcao, setOpenAcao] = useState(false);

  async function load() {
    const [{ data: n }, { data: a }] = await Promise.all([
      supabase.from("nao_conformidades").select("*").eq("id", id).maybeSingle(),
      supabase.from("acoes_corretivas").select("*").eq("nc_id", id).order("created_at"),
    ]);
    setNc((n as Nc | null) ?? null);
    setAcoes((a as Acao[]) ?? []);
  }
  useEffect(() => { load(); }, [id]);

  async function updateStatus(s: NcStatus) {
    const patch: { status: NcStatus; data_fechamento?: string | null } = { status: s };
    if (s === "fechada") patch.data_fechamento = new Date().toISOString();
    const { error } = await supabase.from("nao_conformidades").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  }

  async function updateAcaoStatus(acaoId: string, s: AcaoStatus) {
    const { error } = await supabase.from("acoes_corretivas").update({ status: s }).eq("id", acaoId);
    if (error) return toast.error(error.message);
    load();
  }

  if (!nc) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/qualidade"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
          </Button>
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-mono text-xl font-bold">{nc.numero}</h1>
            <p className="text-sm text-muted-foreground">{nc.titulo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={NC_SEV_TONE[nc.severidade]}>{NC_SEV_LABEL[nc.severidade]}</Badge>
          <Badge variant="outline" className={NC_STATUS_TONE[nc.status]}>{NC_STATUS_LABEL[nc.status]}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhes</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div><Label className="text-xs">Origem</Label><p>{NC_ORIGEM_LABEL[nc.origem as keyof typeof NC_ORIGEM_LABEL]}</p></div>
          <div><Label className="text-xs">Setor</Label><p>{nc.setor ?? "—"}</p></div>
          <div className="sm:col-span-2"><Label className="text-xs">Descrição</Label><p className="whitespace-pre-wrap">{nc.descricao ?? "—"}</p></div>
          <div><Label className="text-xs">Aberta em</Label><p>{new Date(nc.data_abertura).toLocaleString("pt-BR")}</p></div>
          <div><Label className="text-xs">Fechada em</Label><p>{nc.data_fechamento ? new Date(nc.data_fechamento).toLocaleString("pt-BR") : "—"}</p></div>
          {pode && (
            <div className="sm:col-span-2">
              <Label className="text-xs">Alterar status</Label>
              <Select value={nc.status} onValueChange={(v) => updateStatus(v as NcStatus)}>
                <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{NC_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Ações corretivas (5W2H)</CardTitle>
          {pode && (
            <Dialog open={openAcao} onOpenChange={setOpenAcao}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Nova ação</Button>
              </DialogTrigger>
              <AcaoForm ncId={id} onSaved={() => { setOpenAcao(false); load(); }} />
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {acoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>
          ) : acoes.map((a) => (
            <div key={a.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{a.what}</p>
                <Badge variant="outline" className={ACAO_STATUS_TONE[a.status]}>
                  {ACAO_STATUS_LABEL[a.status]}
                </Badge>
              </div>
              <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                {a.why && <p><b>Por quê:</b> {a.why}</p>}
                {a.where_local && <p><b>Onde:</b> {a.where_local}</p>}
                {a.how_como && <p><b>Como:</b> {a.how_como}</p>}
                {a.when_prazo && <p><b>Prazo:</b> {new Date(a.when_prazo).toLocaleDateString("pt-BR")}</p>}
                {a.how_much !== null && <p><b>Custo:</b> R$ {Number(a.how_much).toFixed(2)}</p>}
              </div>
              {pode && (
                <div className="mt-2">
                  <Select value={a.status} onValueChange={(v) => updateAcaoStatus(a.id, v as AcaoStatus)}>
                    <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACAO_STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{ACAO_STATUS_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AcaoForm({ ncId, onSaved }: { ncId: string; onSaved: () => void }) {
  const [what, setWhat] = useState("");
  const [why, setWhy] = useState("");
  const [whereLocal, setWhereLocal] = useState("");
  const [howComo, setHowComo] = useState("");
  const [howMuch, setHowMuch] = useState("");
  const [when, setWhen] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("acoes_corretivas").insert({
      nc_id: ncId, what,
      why: why || null, where_local: whereLocal || null,
      how_como: howComo || null,
      how_much: howMuch ? Number(howMuch) : null,
      when_prazo: when || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Ação registrada");
    onSaved();
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Nova ação corretiva (5W2H)</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>O quê *</Label><Textarea required rows={2} value={what} onChange={(e) => setWhat(e.target.value)} /></div>
        <div><Label>Por quê</Label><Textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Onde</Label><Input value={whereLocal} onChange={(e) => setWhereLocal(e.target.value)} /></div>
          <div><Label>Prazo</Label><Input type="date" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
        </div>
        <div><Label>Como</Label><Textarea rows={2} value={howComo} onChange={(e) => setHowComo(e.target.value)} /></div>
        <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={howMuch} onChange={(e) => setHowMuch(e.target.value)} /></div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar ação"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
