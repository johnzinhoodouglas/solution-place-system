export const FORMATOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/heic"];
export const TAMANHO_MAX_MB = 15;
const MAX_DIMENSAO = 1600;
const QUALIDADE = 0.82;

export function validarArquivoImagem(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const tipoOk =
    FORMATOS_ACEITOS.includes(file.type) ||
    ["jpg", "jpeg", "png", "webp", "heic"].includes(ext) ||
    file.type.startsWith("image/");
  if (!tipoOk) {
    return `"${file.name}" não é uma imagem válida. Use JPG, PNG ou WebP.`;
  }
  if (file.size === 0) return `"${file.name}" está vazio ou corrompido.`;
  if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
    return `"${file.name}" tem ${formatarBytes(file.size)} — o limite é ${TAMANHO_MAX_MB} MB.`;
  }
  return null;
}

export function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Redimensiona e recompacta a imagem no navegador antes do upload. */
export async function comprimirImagem(file: File): Promise<File> {
  if (typeof window === "undefined" || typeof document === "undefined") return file;
  try {
    const bitmap = await carregarBitmap(file);
    const escala = Math.min(1, MAX_DIMENSAO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, largura, altura);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALIDADE),
    );
    if (!blob || blob.size >= file.size) return file;

    const nome = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

async function carregarBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Falha ao ler a imagem"));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

export function nomeSeguroArquivo(nome: string): string {
  return nome.replace(/[^\w.-]/g, "_");
}
