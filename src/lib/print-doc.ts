/**
 * Geração de documentos PDF sem dependências: abre uma janela com o
 * documento formatado e dispara a impressão (o usuário salva como PDF).
 */
export function abrirDocumentoImpressao(titulo: string, corpoHtml: string) {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    alert("Permita pop-ups para gerar o PDF.");
    return;
  }
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
<title>${escapeHtml(titulo)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;margin:32px;line-height:1.5}
  h1{font-size:20px;margin:0 0 4px}
  h2{font-size:14px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.08em;color:#334155;border-bottom:1px solid #cbd5e1;padding-bottom:4px}
  p,li,td,th{font-size:12px}
  .sub{color:#475569;font-size:12px;margin:0}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:10px}
  .brand{font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#f1f5f9}
  ul{margin:6px 0 0 18px;padding:0}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}
  .kv{font-size:12px}
  .kv b{display:inline-block;min-width:130px;color:#334155}
  .alerta{background:#fff7ed;border:1px solid #fdba74;padding:10px;border-radius:6px}
  .assin{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .assin div{border-top:1px solid #94a3b8;padding-top:6px;font-size:11px;text-align:center}
  .fotos{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
  .fotos img{width:100%;border:1px solid #cbd5e1;border-radius:4px}
  footer{margin-top:32px;border-top:1px solid #cbd5e1;padding-top:6px;font-size:10px;color:#64748b}
  @page{margin:16mm}
</style></head><body>
<div class="head">
  <div>
    <div class="brand">Solution Place — Blindagem Veicular</div>
    <p class="sub">Sistema de Gestão da Qualidade — ISO 9001:2015</p>
  </div>
  <p class="sub">${new Date().toLocaleString("pt-BR")}</p>
</div>
${corpoHtml}
<footer>Documento gerado eletronicamente pelo SGQ Solution Place. Registro controlado — ISO 9001:2015.</footer>
<script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
</body></html>`);
  win.document.close();
}

export function escapeHtml(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function listaHtml(itens: unknown[]) {
  if (!itens.length) return "<p class=\"sub\">—</p>";
  return `<ul>${itens.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}
