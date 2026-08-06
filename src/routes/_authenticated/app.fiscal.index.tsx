import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";
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
import {
  brl,
  NF_TIPO_LABEL,
  NF_STATUS_LABEL,
  podeGerirFiscal,
  type NfTipo,
  type NfStatus,
} from "@/lib/comercial";

export const Route = createFileRoute("/_authenticated/app/fiscal/")({ component: FiscalPage });

type Ref = { id: string; nome: string };
type Nf = {
  id: string;
  tipo: NfTipo;
  numero: string;
  serie: string | null;
  natureza: string | null;
  chave: string | null;
  cliente_id: string | null;
  fornecedor_id: string | null;
  data_emissao: string;
  valor: number;
  status: NfStatus;
};

function FiscalPage() {
  const { roles, user } = useCurrentUser();
  const pode = podeGerirFiscal(roles);
  const [notas, setNotas] = useState<Nf[]>([]);
  const [clis, setClis] = useState<Ref[]>([]);
  const [forns, setForns] = useState<Ref[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(true);

  async function load() {
    setBusy(true);
    const [{ data: n }, { data: c }, { data: f }] = await Promise.all([
      supabase
        .from("notas_fiscais")
        .select(
          "id, tipo, numero, serie, natureza, chave, cliente_id, fornecedor_id, data_emissao, valor, status",
        )
        .order("data_emissao", { ascending: false }),
      supabase.from("clientes").select("id, nome").order("nome"),
      supabase.from("fornecedores").select("id, nome").order("nome"),
    ]);
    setNotas((n as Nf[]) ?? []);
    setClis((c as Ref[]) ?? []);
    setForns((f as Ref[]) ?? []);
    setBusy(false);
  }
  useEffect(() => {
    load();
  }, []);

  const nomeParte = (nf: Nf) =>
    nf.tipo === "saida"
      ? (clis.find((x) => x.id === nf.cliente_id)?.nome ?? "—")
      : (forns.find((x) => x.id === nf.fornecedor_id)?.nome ?? "—");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Fiscal — Notas Fiscais</h1>
            <p className="text-sm text-muted-foreground">Documentos fiscais de entrada e saída.</p>
          </div>
        </div>
        {pode && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova NF
              </Button>
            </DialogTrigger>
            <NfForm
              clis={clis}
              forns={forns}
              userId={user?.id ?? null}
              onSaved={() => {
                setOpen(false);
                load();
              }}
            />
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas fiscais</CardTitle>
        </CardHeader>
        <CardContent>
          {busy ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nº/Série</TableHead>
                  <TableHead>Cliente/Fornecedor</TableHead>
                  <TableHead>Natureza</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map((nf) => (
                  <TableRow key={nf.id}>
                    <TableCell>
                      <Badge variant="outline">{NF_TIPO_LABEL[nf.tipo]}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {nf.numero}
                      {nf.serie ? `/${nf.serie}` : ""}
                    </TableCell>
                    <TableCell>{nomeParte(nf)}</TableCell>
                    <TableCell className="text-xs">{nf.natureza ?? "—"}</TableCell>
                    <TableCell>{brl(nf.valor)}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(nf.data_emissao).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{NF_STATUS_LABEL[nf.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {notas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      Nenhuma nota fiscal.
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

function NfForm({
  clis,
  forns,
  onSaved,
  userId,
}: {
  clis: Ref[];
  forns: Ref[];
  onSaved: () => void;
  userId: string | null;
}) {
  const [f, setF] = useState({
    tipo: "saida" as NfTipo,
    numero: "",
    serie: "",
    natureza: "",
    chave: "",
    cliente_id: "",
    fornecedor_id: "",
    data_emissao: new Date().toISOString().slice(0, 10),
    valor: "",
    status: "emitida" as NfStatus,
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("notas_fiscais").insert({
      tipo: f.tipo,
      numero: f.numero,
      serie: f.serie || null,
      natureza: f.natureza || null,
      chave: f.chave || null,
      cliente_id: f.tipo === "saida" ? f.cliente_id || null : null,
      fornecedor_id: f.tipo === "entrada" ? f.fornecedor_id || null : null,
      data_emissao: f.data_emissao,
      valor: Number(f.valor) || 0,
      status: f.status,
      observacoes: f.observacoes || null,
      created_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Nota fiscal registrada");
    onSaved();
  }
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Nova nota fiscal</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo *</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as NfTipo })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as NfStatus })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(NF_STATUS_LABEL) as NfStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {NF_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Número *</Label>
            <Input
              required
              value={f.numero}
              onChange={(e) => setF({ ...f, numero: e.target.value })}
            />
          </div>
          <div>
            <Label>Série</Label>
            <Input value={f.serie} onChange={(e) => setF({ ...f, serie: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Natureza da operação</Label>
          <Input
            value={f.natureza}
            onChange={(e) => setF({ ...f, natureza: e.target.value })}
            placeholder="Ex.: Prestação de serviços de blindagem"
          />
        </div>
        <div>
          <Label>Chave de acesso</Label>
          <Input
            value={f.chave}
            onChange={(e) => setF({ ...f, chave: e.target.value })}
            className="font-mono text-xs"
          />
        </div>
        {f.tipo === "saida" ? (
          <div>
            <Label>Cliente</Label>
            <Select value={f.cliente_id} onValueChange={(v) => setF({ ...f, cliente_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {clis.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label>Fornecedor</Label>
            <Select value={f.fornecedor_id} onValueChange={(v) => setF({ ...f, fornecedor_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {forns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Emissão *</Label>
            <Input
              required
              type="date"
              value={f.data_emissao}
              onChange={(e) => setF({ ...f, data_emissao: e.target.value })}
            />
          </div>
          <div>
            <Label>Valor (R$) *</Label>
            <Input
              required
              type="number"
              step="0.01"
              value={f.valor}
              onChange={(e) => setF({ ...f, valor: e.target.value })}
            />
          </div>
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
