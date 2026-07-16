import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/use-current-user";
import { brl, PC_STATUS_LABEL, podeGerirCompras, type PedidoCompraStatus } from "@/lib/comercial";

export const Route = createFileRoute("/_authenticated/app/compras/")({ component: ComprasPage });

type Fornecedor = { id: string; nome: string; documento: string | null; categoria: string | null; email: string | null; telefone: string | null; cidade: string | null; uf: string | null };
type Pedido = { id: string; numero: string; fornecedor_id: string | null; valor_total: number; status: PedidoCompraStatus; data_pedido: string; data_prev_entrega: string | null; observacoes: string | null };

function ComprasPage() {
  const { roles, user } = useCurrentUser();
  const pode = podeGerirCompras(roles);
  const [forns, setForns] = useState<Fornecedor[]>([]);
  const [peds, setPeds] = useState<Pedido[]>([]);
  const [openF, setOpenF] = useState(false);
  const [openP, setOpenP] = useState(false);
  const [busy, setBusy] = useState(true);

  async function load() {
    setBusy(true);
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from("fornecedores").select("*").order("nome"),
      supabase.from("pedidos_compra").select("id, numero, fornecedor_id, valor_total, status, data_pedido, data_prev_entrega, observacoes").order("created_at", { ascending: false }),
    ]);
    setForns((f as Fornecedor[]) ?? []);
    setPeds((p as Pedido[]) ?? []);
    setBusy(false);
  }
  useEffect(() => { load(); }, []);

  const nomeF = (id: string | null) => forns.find((x) => x.id === id)?.nome ?? "—";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-muted-foreground">Fornecedores e pedidos de compra.</p>
        </div>
      </div>

      <Tabs defaultValue="pedidos">
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos ({peds.length})</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores ({forns.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Pedidos de compra</CardTitle>
              {pode && (
                <Dialog open={openP} onOpenChange={setOpenP}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo</Button></DialogTrigger>
                  <PedidoForm forns={forns} userId={user?.id ?? null} onSaved={()=>{setOpenP(false); load();}} />
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {busy ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Nº</TableHead><TableHead>Fornecedor</TableHead><TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead>Prev. entrega</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {peds.map((p)=>(
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">{p.numero}</TableCell>
                        <TableCell>{nomeF(p.fornecedor_id)}</TableCell>
                        <TableCell>{brl(p.valor_total)}</TableCell>
                        <TableCell><Badge variant="outline">{PC_STATUS_LABEL[p.status]}</Badge></TableCell>
                        <TableCell className="text-xs">{new Date(p.data_pedido).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-xs">{p.data_prev_entrega ? new Date(p.data_prev_entrega).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      </TableRow>
                    ))}
                    {peds.length===0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhum pedido.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fornecedores">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Fornecedores</CardTitle>
              {pode && (
                <Dialog open={openF} onOpenChange={setOpenF}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo</Button></DialogTrigger>
                  <FornForm userId={user?.id ?? null} onSaved={()=>{setOpenF(false); load();}} />
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nome</TableHead><TableHead>CNPJ</TableHead><TableHead>Categoria</TableHead><TableHead>Contato</TableHead><TableHead>Cidade</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {forns.map((c)=>(
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="font-mono text-xs">{c.documento ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.categoria ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.email ?? c.telefone ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.cidade ? `${c.cidade}/${c.uf ?? ""}` : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {forns.length===0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhum fornecedor.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FornForm({ onSaved, userId }: { onSaved: () => void; userId: string | null }) {
  const [f, setF] = useState({ nome: "", documento: "", categoria: "", email: "", telefone: "", cidade: "", uf: "" });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("fornecedores").insert({ ...f, created_by: userId });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Fornecedor cadastrado"); onSaved();
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo fornecedor</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Nome *</Label><Input required value={f.nome} onChange={(e)=>setF({...f, nome:e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>CNPJ/CPF</Label><Input value={f.documento} onChange={(e)=>setF({...f, documento:e.target.value})} /></div>
          <div><Label>Categoria</Label><Input value={f.categoria} onChange={(e)=>setF({...f, categoria:e.target.value})} placeholder="Ex.: Aço, Vidros" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>E-mail</Label><Input type="email" value={f.email} onChange={(e)=>setF({...f, email:e.target.value})} /></div>
          <div><Label>Telefone</Label><Input value={f.telefone} onChange={(e)=>setF({...f, telefone:e.target.value})} /></div>
        </div>
        <div className="grid grid-cols-[1fr_80px] gap-3">
          <div><Label>Cidade</Label><Input value={f.cidade} onChange={(e)=>setF({...f, cidade:e.target.value})} /></div>
          <div><Label>UF</Label><Input maxLength={2} value={f.uf} onChange={(e)=>setF({...f, uf:e.target.value.toUpperCase()})} /></div>
        </div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving?"Salvando...":"Cadastrar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function PedidoForm({ forns, onSaved, userId }: { forns: Fornecedor[]; onSaved: () => void; userId: string | null }) {
  const [f, setF] = useState({ fornecedor_id: "", valor_total: "", data_prev_entrega: "", observacoes: "", status: "rascunho" as PedidoCompraStatus });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("pedidos_compra").insert({
      numero: "", fornecedor_id: f.fornecedor_id || null,
      valor_total: Number(f.valor_total) || 0,
      data_prev_entrega: f.data_prev_entrega || null,
      observacoes: f.observacoes || null, status: f.status, created_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido criado"); onSaved();
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo pedido de compra</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Fornecedor *</Label>
          <Select value={f.fornecedor_id} onValueChange={(v)=>setF({...f, fornecedor_id:v})}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{forns.map((c)=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Valor total (R$)</Label><Input type="number" step="0.01" value={f.valor_total} onChange={(e)=>setF({...f, valor_total:e.target.value})} /></div>
          <div><Label>Prev. entrega</Label><Input type="date" value={f.data_prev_entrega} onChange={(e)=>setF({...f, data_prev_entrega:e.target.value})} /></div>
        </div>
        <div><Label>Status</Label>
          <Select value={f.status} onValueChange={(v)=>setF({...f, status:v as PedidoCompraStatus})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(PC_STATUS_LABEL) as PedidoCompraStatus[]).map(s=><SelectItem key={s} value={s}>{PC_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Observações</Label><Textarea rows={2} value={f.observacoes} onChange={(e)=>setF({...f, observacoes:e.target.value})} /></div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving?"Salvando...":"Criar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
