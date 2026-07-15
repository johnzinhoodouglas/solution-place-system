import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Plus, Search } from "lucide-react";

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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  NC_ORIGEM_LABEL, NC_SEV_LABEL, NC_SEV_TONE, NC_STATUS_LABEL, NC_STATUS_TONE,
  podeGerirQualidade, type NcOrigem, type NcSeveridade, type NcStatus,
} from "@/lib/qsms";

export const Route = createFileRoute("/_authenticated/app/qualidade/")({
  component: QualidadeList,
});

type NcRow = {
  id: string;
  numero: string;
  titulo: string;
  origem: NcOrigem;
  severidade: NcSeveridade;
  status: NcStatus;
  data_abertura: string;
  os_id: string | null;
};

function QualidadeList() {
  const { roles, user } = useCurrentUser();
  const podeCriar = podeGerirQualidade(roles);
  const [rows, setRows] = useState<NcRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    setBusy(true);
    const { data, error } = await supabase
      .from("nao_conformidades")
      .select("id, numero, titulo, origem, severidade, status, data_abertura, os_id")
      .order("data_abertura", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as NcRow[]) ?? []);
    setBusy(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return r.numero.toLowerCase().includes(s) || r.titulo.toLowerCase().includes(s);
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Qualidade — Não Conformidades</h1>
            <p className="text-sm text-muted-foreground">
              Registro de NCs conforme ISO 9001:2015, com ações corretivas (5W2H).
            </p>
          </div>
        </div>
        {podeCriar && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova NC</Button>
            </DialogTrigger>
            <NcForm onSaved={() => { setOpen(false); load(); }} userId={user?.id ?? null} />
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Lista</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar NC..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          {busy ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NC</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Abertura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-semibold">
                      <Link to="/app/qualidade/$id" params={{ id: r.id }} className="hover:text-primary">
                        {r.numero}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{r.titulo}</TableCell>
                    <TableCell className="text-xs">{NC_ORIGEM_LABEL[r.origem]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={NC_SEV_TONE[r.severidade]}>
                        {NC_SEV_LABEL[r.severidade]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={NC_STATUS_TONE[r.status]}>
                        {NC_STATUS_LABEL[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.data_abertura).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Nenhuma NC registrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const ORIGENS: NcOrigem[] = ["auditoria_interna","auditoria_externa","producao","cliente","fornecedor","inspecao","outro"];
const SEVS: NcSeveridade[] = ["baixa","media","alta","critica"];

function NcForm({ onSaved, userId }: { onSaved: () => void; userId: string | null }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [origem, setOrigem] = useState<NcOrigem>("producao");
  const [severidade, setSeveridade] = useState<NcSeveridade>("media");
  const [setor, setSetor] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("nao_conformidades").insert({
      numero: "", titulo, descricao: descricao || null, origem, severidade,
      setor: setor || null, aberta_por: userId, responsavel_id: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Não conformidade registrada");
    onSaved();
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Nova não conformidade</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Título *</Label>
          <Input required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Origem</Label>
            <Select value={origem} onValueChange={(v) => setOrigem(v as NcOrigem)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORIGENS.map((o) => <SelectItem key={o} value={o}>{NC_ORIGEM_LABEL[o]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severidade</Label>
            <Select value={severidade} onValueChange={(v) => setSeveridade(v as NcSeveridade)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVS.map((s) => <SelectItem key={s} value={s}>{NC_SEV_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Setor / área</Label>
          <Input value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex.: Produção — Blindagem" />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar NC"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
