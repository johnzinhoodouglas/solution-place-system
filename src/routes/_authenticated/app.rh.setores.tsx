import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users, UserMinus, UserCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/lib/use-current-user";
import { podeGerirRh } from "@/lib/producao";
import { SETORES } from "@/lib/setores";

export const Route = createFileRoute("/_authenticated/app/rh/setores")({
  head: () => ({
    meta: [
      { title: "RH por Setor e Recolocação | Solution Place" },
      { name: "description", content: "Colaboradores ativos por setor com carga horária, presença e certificados, e fluxo de recolocação após afastamento." },
      { property: "og:title", content: "RH por Setor e Recolocação — Solution Place" },
      { property: "og:description", content: "Indicadores de pessoas por setor e retorno pós-afastamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RhSetoresPage,
});

type Colab = { id: string; nome: string; setor: string | null; cargo: string | null; ativo: boolean };
type Part = { colaborador_id: string | null; presente: boolean; certificado: boolean; treinamentos: { carga_horaria: number } | null };
type Afast = {
  id: string; colaborador_id: string; motivo: string; data_inicio: string; data_prevista_retorno: string | null;
  data_retorno: string | null; status: string; setor_origem: string | null; setor_retorno: string | null;
  cargo_retorno: string | null; aso_apto: boolean; integracao_ok: boolean; treinamento_ok: boolean; observacoes: string | null;
};

const STATUS: Record<string, { l: string; c: string }> = {
  afastado: { l: "Afastado", c: "bg-destructive/15 text-destructive border-destructive/40" },
  em_recolocacao: { l: "Em recolocação", c: "bg-warning/15 text-warning border-warning/40" },
  recolocado: { l: "Recolocado", c: "bg-success/15 text-success border-success/40" },
};

function RhSetoresPage() {
  const { roles } = useCurrentUser();
  const gestor = podeGerirRh(roles);
  const [colabs, setColabs] = useState<Colab[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [afast, setAfast] = useState<Afast[]>([]);
  const [novo, setNovo] = useState(false);
  const [edit, setEdit] = useState<Afast | null>(null);

  async function load() {
    const [c, p, a] = await Promise.all([
      supabase.from("colaboradores").select("id, nome, setor, cargo, ativo").order("nome"),
      supabase.from("treinamento_participantes").select("colaborador_id, presente, certificado, treinamentos(carga_horaria)"),
      supabase.from("afastamentos").select("*").order("data_inicio", { ascending: false }),
    ]);
    setColabs((c.data as Colab[]) ?? []);
    setParts((p.data as unknown as Part[]) ?? []);
    setAfast((a.data as Afast[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  const afastados = new Set(afast.filter((a) => a.status !== "recolocado").map((a) => a.colaborador_id));
  const nomeDe = (id: string) => colabs.find((c) => c.id === id)?.nome ?? "—";

  const porSetor = useMemo(() => {
    const m = new Map<string, { ativos: number; afastados: number; horas: number; inscricoes: number; presencas: number; certificados: number }>();
    const setorDe = new Map(colabs.map((c) => [c.id, c.setor || "Sem setor"]));
    for (const c of colabs.filter((x) => x.ativo)) {
      const k = c.setor || "Sem setor";
      const s = m.get(k) ?? { ativos: 0, afastados: 0, horas: 0, inscricoes: 0, presencas: 0, certificados: 0 };
      if (afastados.has(c.id)) s.afastados++; else s.ativos++;
      m.set(k, s);
    }
    for (const p of parts) {
      if (!p.colaborador_id) continue;
      const s = m.get(setorDe.get(p.colaborador_id) ?? "");
      if (!s) continue;
      s.inscricoes++;
      if (p.presente) { s.presencas++; s.horas += Number(p.treinamentos?.carga_horaria ?? 0); }
      if (p.certificado) s.certificados++;
    }
    return [...m.entries()].sort((a, b) => b[1].ativos - a[1].ativos);
  }, [colabs, parts, afast]);

  async function salvar(a: Partial<Afast>, id?: string) {
    const { error } = id
      ? await supabase.from("afastamentos").update(a).eq("id", id)
      : await supabase.from("afastamentos").insert(a as Afast);
    if (error) return toast.error(error.message);
    toast.success("Registro salvo");
    setNovo(false); setEdit(null); load();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">RH por setor e recolocação</h1>
            <p className="text-sm text-muted-foreground">Ativos, carga horária de treinamento, presença e certificados (ISO 9001 — 7.1.2 e 7.2).</p>
          </div>
        </div>
        <Button variant="outline" asChild><Link to="/app/rh"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao RH</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Colaboradores ativos por setor</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setor</TableHead>
                <TableHead className="text-right">Ativos</TableHead>
                <TableHead className="text-right">Afastados</TableHead>
                <TableHead className="text-right">Carga horária (h)</TableHead>
                <TableHead className="text-right">Presença</TableHead>
                <TableHead className="text-right">Certificados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porSetor.map(([k, s]) => (
                <TableRow key={k}>
                  <TableCell>{k}</TableCell>
                  <TableCell className="text-right font-semibold">{s.ativos}</TableCell>
                  <TableCell className="text-right">{s.afastados}</TableCell>
                  <TableCell className="text-right">{s.horas}</TableCell>
                  <TableCell className="text-right">{s.inscricoes ? Math.round((s.presencas / s.inscricoes) * 100) : 0}%</TableCell>
                  <TableCell className="text-right">{s.certificados}</TableCell>
                </TableRow>
              ))}
              {porSetor.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhum colaborador ativo.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Afastamentos e recolocação</CardTitle>
          {gestor && <Button size="sm" onClick={() => setNovo(true)}><UserMinus className="mr-2 h-4 w-4" />Registrar afastamento</Button>}
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">Fluxo: Afastado → Em recolocação (ASO apto, integração, reciclagem) → Recolocado no setor/cargo de retorno.</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Retorno previsto</TableHead>
                <TableHead>Checklist</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {afast.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{nomeDe(a.colaborador_id)}</TableCell>
                  <TableCell className="text-xs">{a.motivo}</TableCell>
                  <TableCell className="text-xs">{new Date(a.data_inicio + "T12:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-xs">{a.data_prevista_retorno ? new Date(a.data_prevista_retorno + "T12:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-xs">{[a.aso_apto, a.integracao_ok, a.treinamento_ok].filter(Boolean).length}/3</TableCell>
                  <TableCell><Badge variant="outline" className={STATUS[a.status]?.c}>{STATUS[a.status]?.l}</Badge></TableCell>
                  <TableCell>{gestor && a.status !== "recolocado" && <Button size="sm" variant="outline" onClick={() => setEdit(a)}><UserCheck className="mr-1 h-4 w-4" />Recolocar</Button>}</TableCell>
                </TableRow>
              ))}
              {afast.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Nenhum afastamento registrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NovoAfastamento open={novo} onClose={() => setNovo(false)} colabs={colabs.filter((c) => c.ativo && !afastados.has(c.id))} onSave={(a) => salvar(a)} />
      {edit && <Recolocacao a={edit} nome={nomeDe(edit.colaborador_id)} onClose={() => setEdit(null)} onSave={(a) => salvar(a, edit.id)} />}
    </div>
  );
}

function NovoAfastamento({ open, onClose, colabs, onSave }: { open: boolean; onClose: () => void; colabs: Colab[]; onSave: (a: Partial<Afast>) => void }) {
  const [f, setF] = useState({ colaborador_id: "", motivo: "", data_inicio: new Date().toISOString().slice(0, 10), data_prevista_retorno: "" });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar afastamento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Colaborador</Label>
            <Select value={f.colaborador_id} onValueChange={(v) => setF({ ...f, colaborador_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{colabs.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Motivo</Label><Input value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Ex.: acidente de trabalho, licença médica" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Início</Label><Input type="date" value={f.data_inicio} onChange={(e) => setF({ ...f, data_inicio: e.target.value })} /></div>
            <div className="space-y-1"><Label>Retorno previsto</Label><Input type="date" value={f.data_prevista_retorno} onChange={(e) => setF({ ...f, data_prevista_retorno: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!f.colaborador_id || !f.motivo} onClick={() => onSave({
            ...f, data_prevista_retorno: f.data_prevista_retorno || null,
            setor_origem: colabs.find((c) => c.id === f.colaborador_id)?.setor ?? null,
          })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Recolocacao({ a, nome, onClose, onSave }: { a: Afast; nome: string; onClose: () => void; onSave: (a: Partial<Afast>) => void }) {
  const [f, setF] = useState({
    setor_retorno: a.setor_retorno ?? a.setor_origem ?? "", cargo_retorno: a.cargo_retorno ?? "",
    aso_apto: a.aso_apto, integracao_ok: a.integracao_ok, treinamento_ok: a.treinamento_ok,
    data_retorno: a.data_retorno ?? new Date().toISOString().slice(0, 10), observacoes: a.observacoes ?? "",
  });
  const completo = f.aso_apto && f.integracao_ok && f.treinamento_ok && f.setor_retorno;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Recolocação — {nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Setor de retorno</Label>
              <Select value={f.setor_retorno} onValueChange={(v) => setF({ ...f, setor_retorno: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{SETORES.map((s) => <SelectItem key={s.slug} value={s.label}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Cargo/função</Label><Input value={f.cargo_retorno} onChange={(e) => setF({ ...f, cargo_retorno: e.target.value })} /></div>
          </div>
          {([["aso_apto", "ASO de retorno: apto"], ["integracao_ok", "Integração/reambientação feita"], ["treinamento_ok", "Reciclagem de treinamento concluída"]] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <Checkbox checked={f[k]} onCheckedChange={(v) => setF({ ...f, [k]: !!v })} /> {l}
            </label>
          ))}
          <div className="space-y-1"><Label>Data de retorno</Label><Input type="date" value={f.data_retorno} onChange={(e) => setF({ ...f, data_retorno: e.target.value })} /></div>
          <div className="space-y-1"><Label>Observações</Label><Textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onSave({ ...f, status: "em_recolocacao" })}>Salvar andamento</Button>
          <Button disabled={!completo} onClick={() => onSave({ ...f, status: "recolocado" })}>Concluir recolocação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
