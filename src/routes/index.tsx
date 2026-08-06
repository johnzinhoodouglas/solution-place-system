import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Shield, Factory, TrendingUp, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Solution Place — Gestão ISO 9001:2015 para blindagem";
const DESCRIPTION =
  "Sistema de gestão da produção de veículos blindados: recepção, engenharia, compras, produção, qualidade, segurança, financeiro, fiscal e melhoria contínua.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-sidebar/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-md"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Solution Place</p>
              <p className="text-xs text-muted-foreground">Sistema ISO 9001:2015</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/auth">Acessar sistema</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            Gestão da produção de veículos blindados
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Um sistema. <span className="text-accent">Todas as etapas.</span>
            <br />
            Da recepção à entrega.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Plataforma integrada baseada na norma ISO 9001:2015 para controlar vendas,
            engenharia, compras, produção, qualidade, segurança do trabalho, financeiro,
            fiscal, recicláveis e melhoria contínua — com rastreabilidade total e
            dashboards em tempo real por etapa.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                Criar acesso
              </Link>
            </Button>
          </div>
        </div>

        {/* Highlights */}
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Factory,
              title: "Fluxograma produtivo",
              text: "Cada etapa interligada com a próxima, com controle de acesso por setor.",
            },
            {
              icon: Shield,
              title: "Qualidade ISO 9001",
              text: "Inspeções, não conformidades, ações corretivas e auditorias.",
            },
            {
              icon: HardHat,
              title: "Segurança e ergonomia",
              text: "EPIs, DDS, incidentes e checklists ergonômicos por colaborador.",
            },
            {
              icon: TrendingUp,
              title: "Melhoria contínua",
              text: "PDCA, indicadores por setor e controle financeiro de recicláveis.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-card p-5"
              style={{ boxShadow: "var(--shadow-elevated)" }}
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Solution Place · Gestão baseada na ISO 9001:2015
      </footer>
    </div>
  );
}
