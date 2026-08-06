import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Recycle, Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
import { brl } from "@/lib/comercial";
import type { AppRole } from "@/lib/setores";

export const Route = createFileRoute("/_authenticated/app/reciclaveis/")({
  component: ReciclaveisPage,
  errorComponent: ({ error }) => <p className="text-sm text-destructive">{error.message}</p>,
});

type SucataTipo = "aco_304" | "lataria" | "vidro" | "manta" | "outros";

const TIPO_LABEL: Record<SucataTipo, string> = {
  aco_304: "Aço inox 304",
  lataria: "Lataria",
  vidro: "Vidro",
  manta: "Manta / compósito",
  outros: "Outros",
};

const TIPOS = Object.keys(TIPO_LABEL) as SucataTipo[];

type Mov = {
  id: string;
  tipo: SucataTipo;
  descricao: string | null;
  kg: number;
  valor_kg: number;
  valor_total: number;
  os_id: string | null;
  setor: string | null;
  destino: string | null;
  data_movimento: string;
  responsavel_nome: string | null;
};

type OsRef = { id: string; numero: string };

function podeLancar(roles: AppRole[]) {
  return roles.some((r) =>
    ["master", "diretoria", "producao", "qualidade", "financeiro"].includes(r),
  );
}

function ReciclaveisPage() {
  const { roles, user, profile } = useCurrentUser();
  const pode = podeLancar(roles);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [oss, setOss] = useState<OsRef[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | SucataTipo>("todos");

  async function load() {
    setBusy(true);
    const [{ data: m }, { data: o }] = await Promise.all([
      supabase
        .from("sucata_movimentos")
        .select(
          "id, tipo, descricao, kg, valor_kg, valor_total, os_id, setor, destino, data_movimento, responsavel_nome",
        )
        .order("data_movimento", { ascending: false }),
      supabase
        .from("ordens_servico")
        .select("id, numero")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setMovs((m as Mov[]) ?? []);
    setOss((o as OsRef[]) ?? []);
    setBusy(false);
  }
  useEffect(() => {
    load();
  }, []);

  const lista = filtro === "todos" ? movs : movs.filter((m) => m.tipo === filtro);

  const kpis = useMemo(() => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    const doMes = movs.filter((m) => m.data_movimento.slice(0, 7) === mesAtual);
    const kgMes = doMes.reduce((s, m) => s + Number(m.kg), 0);
    const receitaMes = doMes.reduce((s, m) => s + Number(m.valor_total), 0);
    const kgTotal = movs.reduce((s, m) => s + Number(m.kg), 0);
    const receitaTotal = movs.reduce((s, m) => s + Number(m.valor_total), 0);
    return { kgMes, receitaMes, kgTotal, receitaTotal };
  }, [movs]);

  const porTipo = useMemo(
    () =>
      TIPOS.map((t) => ({
        tipo: TIPO_LABEL[t],
        kg: movs.filter((m) => m.tipo === t).reduce((s, m) => s + Number(m.kg), 0),
        valor: movs.filter((m) => m.tipo === t).reduce((s, m) => s + Number(m.valor_total), 0),
      })).filter((d) => d.kg > 0 || d.valor > 0),
    [movs],
  );

  const numeroOs = (id: string | null) =>
    id ? (oss.find((o) => o.id === id)?.numero ?? "—") : "—";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Recycle className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Recicláveis / Sucata</h1>
            <p className="text-sm text-muted-foreground">
              Aço inox 304, lataria e demais resíduos — peso, destinação e retorno financeiro (ISO
              9001:2015, cláusula 8.5.1 e Lean).
            </p>
          </div>
        </div>
        {pode && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo movimento
              </Button>
            </DialogTrigger>
            <MovForm
              oss={oss}
              userId={user?.id ?? null}
              responsavel={profile?.nome ?? profile?.email ?? ""}
              onSaved={() => {
                setOpen(false);
                load();
              }}
            />
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Sucata no mês (kg)", value: kpis.kgMes.toLocaleString("pt-BR") },
          { label: "Retorno no mês", value: brl(kpis.receitaMes) },
          { label: "Total acumulado (kg)", value: kpis.kgTotal.toLocaleString("pt-BR") },
          { label: "Retorno acumulado", value: brl(kpis.receitaTotal) },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume por material (kg)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {porTipo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem movimentos registrados ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porTipo}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="kg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Movimentos</CardTitle>
          <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os materiais</SelectItem>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {busy ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>kg</TableHead>
                  <TableHead>R$/kg</TableHead>
                  <TableHead>Retorno</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">
                      {new Date(m.data_movimento + "T12:00:00").toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TIPO_LABEL[m.tipo]}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{numeroOs(m.os_id)}</TableCell>
                    <TableCell className="text-xs">{m.setor ?? "—"}</TableCell>
                    <TableCell>{Number(m.kg).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{brl(m.valor_kg)}</TableCell>
                    <TableCell className="font-medium">{brl(m.valor_total)}</TableCell>
                    <TableCell className="text-xs">{m.destino ?? "—"}</TableCell>
                    <TableCell className="text-xs">{m.responsavel_nome ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {lista.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                      Nenhum movimento de sucata.
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

function MovForm({
  oss,
  userId,
  responsavel,
  onSaved,
}: {
  oss: OsRef[];
  userId: string | null;
  responsavel: string;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    tipo: "aco_304" as SucataTipo,
    descricao: "",
    kg: "",
    valor_kg: "",
    os_id: "",
    setor: "",
    destino: "",
    data_movimento: new Date().toISOString().slice(0, 10),
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("sucata_movimentos").insert({
      tipo: f.tipo,
      descricao: f.descricao || null,
      kg: Number(f.kg) || 0,
      valor_kg: Number(f.valor_kg) || 0,
      os_id: f.os_id || null,
      setor: f.setor || null,
      destino: f.destino || null,
      data_movimento: f.data_movimento,
      observacoes: f.observacoes || null,
      responsavel_nome: responsavel || null,
      created_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Movimento registrado");
    onSaved();
  }

  const total = (Number(f.kg) || 0) * (Number(f.valor_kg) || 0);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Novo movimento de sucata</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Material *</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as SucataTipo })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data *</Label>
            <Input
              required
              type="date"
              value={f.data_movimento}
              onChange={(e) => setF({ ...f, data_movimento: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Peso (kg) *</Label>
            <Input
              required
              type="number"
              step="0.01"
              value={f.kg}
              onChange={(e) => setF({ ...f, kg: e.target.value })}
            />
          </div>
          <div>
            <Label>Valor por kg (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={f.valor_kg}
              onChange={(e) => setF({ ...f, valor_kg: e.target.value })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Retorno estimado: <strong className="text-foreground">{brl(total)}</strong>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>OS de origem</Label>
            <Select value={f.os_id} onValueChange={(v) => setF({ ...f, os_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
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
          <div>
            <Label>Setor gerador</Label>
            <Input
              value={f.setor}
              onChange={(e) => setF({ ...f, setor: e.target.value })}
              placeholder="Ex.: Aço, Lataria"
            />
          </div>
        </div>
        <div>
          <Label>Destino / comprador</Label>
          <Input
            value={f.destino}
            onChange={(e) => setF({ ...f, destino: e.target.value })}
            placeholder="Ex.: Recicladora XYZ"
          />
        </div>
        <div>
          <Label>Descrição</Label>
          <Input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea
            rows={2}
            value={f.observacoes}
            onChange={(e) => setF({ ...f, observacoes: e.target.value })}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
