import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DollarSign, Plus, TrendingUp, TrendingDown } from "lucide-react";
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
import { brl, TITULO_STATUS_LABEL, TITULO_STATUS_TONE, podeGerirFinanceiro, type TituloStatus } from "@/lib/comercial";

export const Route = createFileRoute("/_authenticated/app/financeiro/")({ component: FinanceiroPage });

type Ref = { id: string; nome: string };
type Pagar = { id: string; descricao: string; fornecedor_id: string | null; valor: number; data_vencimento: string; data_pagamento: string | null; status: TituloStatus };
type Receber = { id: string; descricao: string; cliente_id: string | null; valor: number; data_vencimento: string; data_recebimento: string | null; status: TituloStatus };

function FinanceiroPage() {
  const { roles, user } = useCurrentUser();
  const pode = podeGerirFinanceiro(roles);
  const [pagar, setPagar] = useState<Pagar[]>([]);
  const [receber, setReceber] = useState<Receber[]>([]);
  const [forns, setForns] = useState<Ref[]>([]);
  const [clis, setClis] = useState<Ref[]>([]);
  const [openCp, setOpenCp] = useState(false);
  const [openCr, setOpenCr] = useState(false);

  async function load() {
    const [{ data: cp }, { data: cr }, { data: f }, { data: c }] = await Promise.all([
      supabase.from("contas_pagar").select("id, descricao, fornecedor_id, valor, data_vencimento, data_pagamento, status").order("data_vencimento"),
      supabase.from("contas_receber").select("id, descricao, cliente_id, valor, data_vencimento, data_recebimento, status").order("data_vencimento"),
      supabase.from("fornecedores").select("id, nome").order("nome"),
      supabase.from("clientes").select("id, nome").order("nome"),
    ]);
    setPagar((cp as Pagar[]) ?? []);
    setReceber((cr as Receber[]) ?? []);
    setForns((f as Ref[]) ?? []);
    setClis((c as Ref[]) ?? []);
  }
  useEffect(()=>{ load(); }, []);

  const kpis = useMemo(() => {
    const abertoPagar = pagar.filter((p)=>p.status==="aberto"||p.status==="parcial"||p.status==="vencido").reduce((s,p)=>s+Number(p.valor),0);
    const abertoReceber = receber.filter((r)=>r.status==="aberto"||r.status==="parcial"||r.status==="vencido").reduce((s,r)=>s+Number(r.valor),0);
    return { abertoPagar, abertoReceber, saldo: abertoReceber - abertoPagar };
  }, [pagar, receber]);

  const nomeF = (id: string | null) => forns.find((x)=>x.id===id)?.nome ?? "—";
  const nomeC = (id: string | null) => clis.find((x)=>x.id===id)?.nome ?? "—";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Contas a pagar, contas a receber e fluxo de caixa.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">A receber</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-success flex items-center gap-2"><TrendingUp className="h-5 w-5" />{brl(kpis.abertoReceber)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">A pagar</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive flex items-center gap-2"><TrendingDown className="h-5 w-5" />{brl(kpis.abertoPagar)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Saldo projetado</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${kpis.saldo>=0?"text-success":"text-destructive"}`}>{brl(kpis.saldo)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="receber">
        <TabsList>
          <TabsTrigger value="receber">A Receber ({receber.length})</TabsTrigger>
          <TabsTrigger value="pagar">A Pagar ({pagar.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="receber">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Contas a receber</CardTitle>
              {pode && <Dialog open={openCr} onOpenChange={setOpenCr}>
                <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo</Button></DialogTrigger>
                <TituloForm tipo="receber" refs={clis} refLabel="Cliente" userId={user?.id ?? null} onSaved={()=>{setOpenCr(false); load();}} />
              </Dialog>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Descrição</TableHead><TableHead>Cliente</TableHead><TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead><TableHead>Recebimento</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {receber.map((r)=>(
                    <TableRow key={r.id}>
                      <TableCell>{r.descricao}</TableCell>
                      <TableCell>{nomeC(r.cliente_id)}</TableCell>
                      <TableCell>{brl(r.valor)}</TableCell>
                      <TableCell className="text-xs">{new Date(r.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-xs">{r.data_recebimento ? new Date(r.data_recebimento).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={TITULO_STATUS_TONE[r.status]}>{TITULO_STATUS_LABEL[r.status]}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {receber.length===0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhum título.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagar">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Contas a pagar</CardTitle>
              {pode && <Dialog open={openCp} onOpenChange={setOpenCp}>
                <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo</Button></DialogTrigger>
                <TituloForm tipo="pagar" refs={forns} refLabel="Fornecedor" userId={user?.id ?? null} onSaved={()=>{setOpenCp(false); load();}} />
              </Dialog>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Descrição</TableHead><TableHead>Fornecedor</TableHead><TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead><TableHead>Pagamento</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagar.map((p)=>(
                    <TableRow key={p.id}>
                      <TableCell>{p.descricao}</TableCell>
                      <TableCell>{nomeF(p.fornecedor_id)}</TableCell>
                      <TableCell>{brl(p.valor)}</TableCell>
                      <TableCell className="text-xs">{new Date(p.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-xs">{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={TITULO_STATUS_TONE[p.status]}>{TITULO_STATUS_LABEL[p.status]}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {pagar.length===0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhum título.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TituloForm({ tipo, refs, refLabel, onSaved, userId }: { tipo: "pagar" | "receber"; refs: Ref[]; refLabel: string; onSaved: () => void; userId: string | null }) {
  const [f, setF] = useState({ descricao: "", ref_id: "", valor: "", data_vencimento: "", observacoes: "", status: "aberto" as TituloStatus });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const table = tipo === "pagar" ? "contas_pagar" : "contas_receber";
    const payload: Record<string, unknown> = {
      descricao: f.descricao, valor: Number(f.valor) || 0,
      data_vencimento: f.data_vencimento, observacoes: f.observacoes || null,
      status: f.status, created_by: userId,
    };
    if (tipo === "pagar") payload.fornecedor_id = f.ref_id || null;
    else payload.cliente_id = f.ref_id || null;
    const { error } = await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Título registrado"); onSaved();
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo título — {tipo === "pagar" ? "Pagar" : "Receber"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Descrição *</Label><Input required value={f.descricao} onChange={(e)=>setF({...f, descricao:e.target.value})} /></div>
        <div><Label>{refLabel}</Label>
          <Select value={f.ref_id} onValueChange={(v)=>setF({...f, ref_id:v})}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{refs.map((r)=><SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Valor (R$) *</Label><Input required type="number" step="0.01" value={f.valor} onChange={(e)=>setF({...f, valor:e.target.value})} /></div>
          <div><Label>Vencimento *</Label><Input required type="date" value={f.data_vencimento} onChange={(e)=>setF({...f, data_vencimento:e.target.value})} /></div>
        </div>
        <div><Label>Status</Label>
          <Select value={f.status} onValueChange={(v)=>setF({...f, status:v as TituloStatus})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(TITULO_STATUS_LABEL) as TituloStatus[]).map(s=><SelectItem key={s} value={s}>{TITULO_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Observações</Label><Textarea rows={2} value={f.observacoes} onChange={(e)=>setF({...f, observacoes:e.target.value})} /></div>
        <DialogFooter><Button type="submit" disabled={saving}>{saving?"Salvando...":"Registrar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
