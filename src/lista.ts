// Lista de espera do site: inscrição e saída. Sem IP, sem nome, sem user-agent no banco.
// O IP só passa pelo limitador de taxa (binding da Cloudflare, nada gravado aqui).

export interface Env {
  DB: D1Database;
  LIMITE_POR_IP: Pick<RateLimit, "limit">; // em produção, RPC para o Limitador do Worker brandoc-lista-limpeza
  TURNSTILE_SECRET: string;
}

/** Data da política de privacidade aceita (a "Atualizada em" de privacidade.html). */
export const VERSAO_DO_CONSENTIMENTO = "2026-11-27";

export const ESPECIALIDADES = [
  "ginecologia-obstetricia", "clinica-medica", "medicina-familia", "pediatria", "cardiologia", "dermatologia",
  "endocrinologia", "psiquiatria", "ortopedia", "oftalmologia", "outra-medica", "odontologia", "psicologia",
  "nutricao", "fisioterapia", "outra-profissao",
];

const MAX_CORPO = 4096;
const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const CODIGO = /^[A-Za-z0-9_-]{22}$/;

const json = (corpo: unknown, status = 200) =>
  Response.json(corpo, { status, headers: { "cache-control": "no-store" } });

const mesmaOrigem = (pedido: Request) => pedido.headers.get("origin") === new URL(pedido.url).origin;

async function sha256(texto: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function codigoNovo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16)); // 128 bits
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function dentroDoLimite(pedido: Request, env: Env) {
  const ip = pedido.headers.get("cf-connecting-ip") ?? "local";
  return (await env.LIMITE_POR_IP.limit({ key: ip })).success;
}

export async function inscrever(pedido: Request, env: Env, buscar: typeof fetch = fetch): Promise<Response> {
  if (!mesmaOrigem(pedido)) return json({ erro: "origem" }, 403);
  if (!(await dentroDoLimite(pedido, env))) return json({ erro: "limite" }, 429);
  const bruto = await pedido.text();
  if (bruto.length > MAX_CORPO) return json({ erro: "tamanho" }, 413);
  const campos = new URLSearchParams(bruto);

  const email = (campos.get("email") ?? "").trim().toLowerCase();
  const especialidade = campos.get("especialidade") ?? "";
  if (email.length > 254 || !EMAIL.test(email)) return json({ erro: "email" }, 400);
  if (!ESPECIALIDADES.includes(especialidade)) return json({ erro: "especialidade" }, 400);
  if (campos.get("consentimento") !== "sim") return json({ erro: "consentimento" }, 400);

  const token = campos.get("cf-turnstile-response") ?? "";
  if (!token || !(await turnstileValido(token, env.TURNSTILE_SECRET, buscar))) return json({ erro: "verificacao" }, 403);

  const agora = new Date().toISOString();
  const codigo = codigoNovo();
  // Idempotente: o e-mail repetido não muda a inscrição e responde igual (não revela se já estava na lista).
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO inscricao (email, especialidade, criada_em, consentimento_versao, consentimento_em)
       VALUES (?1, ?2, ?3, ?4, ?3) ON CONFLICT(email) DO NOTHING`,
    ).bind(email, especialidade, agora, VERSAO_DO_CONSENTIMENTO),
    env.DB.prepare("INSERT INTO saida (hash, inscricao) SELECT ?1, id FROM inscricao WHERE email = ?2")
      .bind(await sha256(codigo), email),
  ]);
  return json({ saida: `${new URL(pedido.url).origin}/sair/${codigo}` });
}

async function turnstileValido(token: string, segredo: string, buscar: typeof fetch): Promise<boolean> {
  const corpo = new FormData();
  corpo.append("secret", segredo);
  corpo.append("response", token);
  try {
    const r = await buscar("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: corpo });
    return r.ok && (await r.json<{ success?: boolean }>()).success === true;
  } catch {
    return false;
  }
}

export async function sair(pedido: Request, env: Env): Promise<Response> {
  const codigo = new URL(pedido.url).pathname.split("/")[2] ?? "";
  if (pedido.method === "POST") {
    if (!mesmaOrigem(pedido)) return pagina(403, "Não deu certo", "<p>Abra o link de saída de novo e confirme por ele.</p>");
    if (!(await dentroDoLimite(pedido, env))) return pagina(429, "Muitas tentativas", "<p>Espere um minuto e tente de novo.</p>");
  }
  const achada = CODIGO.test(codigo)
    ? await env.DB.prepare("SELECT inscricao FROM saida WHERE hash = ?").bind(await sha256(codigo)).first<{ inscricao: number }>()
    : null;
  if (!achada) {
    return pagina(404, "Este link não vale mais",
      "<p>Ou você já saiu da lista, ou o link está incompleto. Se precisar, escreva para " +
      '<a href="mailto:privacidade@brandoc.com.br">privacidade@brandoc.com.br</a>.</p>');
  }
  if (pedido.method !== "POST") {
    return pagina(200, "Sair da lista de espera",
      "<p>Ao confirmar, apagamos o seu e-mail e a especialidade. Não fica nada guardado.</p>" +
      '<form method="post"><button class="botao" type="submit">Sair da lista</button></form>');
  }
  // As saídas somem junto (ON DELETE CASCADE).
  await env.DB.prepare("DELETE FROM inscricao WHERE id = ?").bind(achada.inscricao).run();
  return pagina(200, "Você saiu da lista", '<p>Apagamos o seu e-mail e a especialidade. <a href="/">Voltar ao início</a></p>');
}

function pagina(status: number, titulo: string, corpo: string): Response {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${titulo} · Brandoc</title>
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/marca/simbolo.svg" type="image/svg+xml">
<link rel="stylesheet" href="/estilo.css">
</head>
<body>
<main class="documento">
<p><a href="/">Brandoc</a></p>
<h1>${titulo}</h1>
${corpo}
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "same-origin", // com no-referrer o navegador manda Origin: null no POST
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}
