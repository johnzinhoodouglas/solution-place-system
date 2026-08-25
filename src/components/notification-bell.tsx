import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, AlertTriangle, ClipboardCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrentUser } from "@/lib/use-current-user";

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string | null;
  tipo: string;
  severidade: string;
  link: string | null;
  lida: boolean;
  created_at: string;
};

const TOM: Record<string, string> = {
  critico: "text-destructive",
  aviso: "text-warning",
  info: "text-primary",
};

function tempoRelativo(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function NotificationBell() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);

  const carregar = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notificacoes")
      .select("id, titulo, mensagem, tipo, severidade, link, lida, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setItens((data as Notificacao[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItens([]);
      return;
    }
    carregar();
    const canal = supabase
      .channel("notificacoes-usuario")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        () => carregar(),
      )
      .subscribe();
    const timer = window.setInterval(carregar, 60000);
    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(canal);
    };
  }, [user, carregar]);

  const naoLidas = itens.filter((i) => !i.lida).length;

  async function marcarTodas() {
    if (!user || naoLidas === 0) return;
    setItens((prev) => prev.map((i) => ({ ...i, lida: true })));
    await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", user.id)
      .eq("lida", false);
  }

  async function abrir(n: Notificacao) {
    setOpen(false);
    if (!n.lida) {
      setItens((prev) => prev.map((i) => (i.id === n.id ? { ...i, lida: true } : i)));
      await supabase.from("notificacoes").update({ lida: true }).eq("id", n.id);
    }
    if (n.link) navigate({ to: n.link } as never);
  }

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Alertas</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={marcarTodas}>
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Marcar lidas
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          {itens.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum alerta no momento.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {itens.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => abrir(n)}
                    className={`flex w-full gap-2 px-3 py-2 text-left hover:bg-muted/60 ${n.lida ? "opacity-60" : ""}`}
                  >
                    {n.tipo === "inspecao" ? (
                      <ClipboardCheck
                        className={`mt-0.5 h-4 w-4 shrink-0 ${TOM[n.severidade] ?? TOM.info}`}
                      />
                    ) : (
                      <AlertTriangle
                        className={`mt-0.5 h-4 w-4 shrink-0 ${TOM[n.severidade] ?? TOM.info}`}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{n.titulo}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {tempoRelativo(n.created_at)}
                        </span>
                      </span>
                      {n.mensagem && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {n.mensagem}
                        </span>
                      )}
                      {!n.lida && (
                        <Badge variant="outline" className="mt-1 h-4 px-1 text-[10px]">
                          novo
                        </Badge>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
