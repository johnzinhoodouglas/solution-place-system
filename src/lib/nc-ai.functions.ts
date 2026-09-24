import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AnaliseIa = {
  resumo: string;
  causas: { causa: string; categoria: string; probabilidade: string; justificativa: string }[];
  acoes: { what: string; why: string; how: string; responsavel_sugerido: string; prazo_dias: number }[];
  gerado_em?: string;
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "causas", "acoes"],
  properties: {
    resumo: { type: "string" },
    causas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["causa", "categoria", "probabilidade", "justificativa"],
        properties: {
          causa: { type: "string" },
          categoria: {
            type: "string",
            enum: ["Método", "Máquina", "Mão de obra", "Material", "Medição", "Meio ambiente"],
          },
          probabilidade: { type: "string", enum: ["alta", "media", "baixa"] },
          justificativa: { type: "string" },
        },
      },
    },
    acoes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["what", "why", "how", "responsavel_sugerido", "prazo_dias"],
        properties: {
          what: { type: "string" },
          why: { type: "string" },
          how: { type: "string" },
          responsavel_sugerido: { type: "string" },
          prazo_dias: { type: "number" },
        },
      },
    },
  },
};

export const analisarNc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ncId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("IA não configurada.");
    const sb = context.supabase;
    const { data: nc, error } = await sb
      .from("nao_conformidades")
      .select("*")
      .eq("id", data.ncId)
      .maybeSingle();
    if (error || !nc) throw new Error("NC não encontrada.");

    const ev = (Array.isArray(nc.evidencias) ? nc.evidencias : []) as {
      tipo?: string;
      texto?: string;
      path?: string;
      nome?: string;
    }[];
    const textos = ev.filter((e) => e.texto).map((e) => `- ${e.texto}`);
    const imagens: string[] = [];
    for (const e of ev.filter((x) => x.path).slice(0, 4)) {
      const { data: s } = await sb.storage.from("inspecoes").createSignedUrl(e.path!, 600);
      if (s?.signedUrl) imagens.push(s.signedUrl);
    }

    const prompt = `Não conformidade de uma empresa de blindagem veicular (ISO 9001:2015, cláusula 10.2).
Número: ${nc.numero}
Título: ${nc.titulo}
Origem: ${nc.origem} | Severidade: ${nc.severidade} | Setor: ${nc.setor ?? "—"} | Etapa: ${nc.etapa ?? "—"}
Descrição: ${nc.descricao ?? "—"}
Evidências textuais:
${textos.join("\n") || "- nenhuma"}
${imagens.length ? `${imagens.length} foto(s) de evidência anexada(s).` : ""}

Faça uma análise de causa raiz (6M/Ishikawa e 5 porquês). Liste de 2 a 5 causas prováveis ordenadas da mais provável para a menos, e de 2 a 5 ações corretivas no formato 5W2H que eliminem a causa raiz (não só a correção imediata). Responda em português do Brasil, de forma objetiva. Prazo em dias corridos.`;

    const content: Record<string, unknown>[] = [{ type: "input_text", text: prompt }];
    for (const url of imagens) content.push({ type: "input_image", image_url: url });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [{ role: "user", content }],
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "analise_nc", strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) {
      const msg =
        res.status === 429
          ? "Muitas solicitações à IA. Tente novamente em instantes."
          : res.status === 402
            ? "Créditos de IA esgotados no workspace."
            : `Falha na IA (${res.status}).`;
      throw new Error(msg);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let texto = "";
    let recusa = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const partes = buf.split("\n");
      buf = partes.pop() ?? "";
      for (const linha of partes) {
        if (!linha.startsWith("data:")) continue;
        const raw = linha.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const ev = JSON.parse(raw);
          if (ev.type === "response.output_text.delta") texto += ev.delta ?? "";
          if (ev.type === "response.refusal.delta") recusa = true;
          if (ev.type === "error" || ev.type === "response.failed")
            throw new Error("A IA não conseguiu concluir a análise.");
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("A IA")) throw e;
        }
      }
    }
    if (recusa || !texto) throw new Error("A IA não retornou uma análise para esta NC.");

    let analise: AnaliseIa;
    try {
      analise = JSON.parse(texto);
    } catch {
      throw new Error("Resposta da IA em formato inesperado. Tente novamente.");
    }
    analise.gerado_em = new Date().toISOString();
    await sb
      .from("nao_conformidades")
      .update({ analise_ia: analise as never })
      .eq("id", data.ncId);
    return analise;
  });
