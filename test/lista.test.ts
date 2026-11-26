import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { VERSAO_DO_CONSENTIMENTO, inscrever, sair } from "../src/lista";
import { limpar } from "../limpeza/src/limpar";

const SITE = "https://brandoc.exemplo";
let ipDaVez = 0;

// Turnstile falso: confere o segredo e aceita só o token "bom".
const verificador = async (url: RequestInfo | URL, init?: RequestInit) => {
  expect(String(url)).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
  const corpo = init!.body as FormData;
  const ok = corpo.get("secret") === "segredo-de-teste" && corpo.get("response") === "bom";
  return Response.json({ success: ok });
};

function pedido(campos: Record<string, string>, ip = `10.0.0.${++ipDaVez}`, origem: string | null = SITE) {
  const headers: Record<string, string> = { "cf-connecting-ip": ip };
  if (origem) headers.origin = origem;
  return new Request(`${SITE}/api/lista`, { method: "POST", headers, body: new URLSearchParams(campos) });
}

const valido = { email: "Ana@Exemplo.com.br ", especialidade: "clinica-medica", consentimento: "sim", "cf-turnstile-response": "bom" };

async function linhas() {
  return (await env.DB.prepare("SELECT * FROM inscricao").all<Record<string, string>>()).results;
}

beforeEach(async () => {
  await env.DB.batch([env.DB.prepare("DELETE FROM saida"), env.DB.prepare("DELETE FROM inscricao")]);
});

describe("inscrição", () => {
  it("grava e-mail minúsculo, especialidade, data e versão do consentimento, e devolve o link de saída", async () => {
    const r = await inscrever(pedido(valido), env, verificador);
    expect(r.status).toBe(200);
    const { saida } = await r.json<{ saida: string }>();
    expect(saida).toMatch(/^https:\/\/brandoc\.exemplo\/sair\/[A-Za-z0-9_-]{22}$/);
    const [l] = await linhas();
    expect(l.email).toBe("ana@exemplo.com.br");
    expect(l.especialidade).toBe("clinica-medica");
    expect(l.consentimento_versao).toBe(VERSAO_DO_CONSENTIMENTO);
    expect(Date.parse(l.criada_em)).toBeGreaterThan(Date.now() - 60_000);
    expect(Object.keys(l).sort()).toEqual(["consentimento_em", "consentimento_versao", "criada_em", "email", "especialidade", "id"]);
    // Só o hash do código fica no banco.
    const codigo = saida.split("/").pop()!;
    const s = await env.DB.prepare("SELECT hash FROM saida").first<{ hash: string }>();
    expect(s!.hash).not.toContain(codigo);
    expect(s!.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("e-mail repetido não duplica, responde igual e dá um link novo; o primeiro continua valendo", async () => {
    const a = await (await inscrever(pedido(valido), env, verificador)).json<{ saida: string }>();
    const r = await inscrever(pedido({ ...valido, email: "ana@exemplo.com.br", especialidade: "pediatria" }), env, verificador);
    expect(r.status).toBe(200);
    const b = await r.json<{ saida: string }>();
    expect(b.saida).not.toBe(a.saida);
    expect(await linhas()).toHaveLength(1);
    expect((await linhas())[0].especialidade).toBe("clinica-medica");
    const fim = await sair(new Request(a.saida, { method: "POST", headers: { origin: SITE } }), env);
    expect(fim.status).toBe(200);
    expect(await linhas()).toHaveLength(0);
  });

  it("sem consentimento não grava", async () => {
    const r = await inscrever(pedido({ ...valido, consentimento: "" }), env, verificador);
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: "consentimento" });
    expect(await linhas()).toHaveLength(0);
  });

  it("Turnstile inválido ou ausente não grava", async () => {
    for (const token of ["ruim", ""]) {
      const r = await inscrever(pedido({ ...valido, "cf-turnstile-response": token }), env, verificador);
      expect(r.status).toBe(403);
      expect(await r.json()).toEqual({ erro: "verificacao" });
    }
    expect(await linhas()).toHaveLength(0);
  });

  it("recusa e-mail inválido, especialidade fora da lista, outra origem e corpo grande", async () => {
    expect((await inscrever(pedido({ ...valido, email: "sem-arroba" }), env, verificador)).status).toBe(400);
    expect((await inscrever(pedido({ ...valido, email: "a@b.c".padStart(300, "x") }), env, verificador)).status).toBe(400);
    expect((await inscrever(pedido({ ...valido, especialidade: "astrologia" }), env, verificador)).status).toBe(400);
    expect((await inscrever(pedido(valido, undefined, "https://outro.exemplo"), env, verificador)).status).toBe(403);
    expect((await inscrever(pedido(valido, undefined, null), env, verificador)).status).toBe(403);
    expect((await inscrever(pedido({ ...valido, lixo: "x".repeat(5000) }), env, verificador)).status).toBe(413);
    expect(await linhas()).toHaveLength(0);
  });

  it("limita por IP: o sexto pedido no mesmo minuto recebe 429", async () => {
    const estados = [];
    for (let i = 0; i < 6; i++) {
      estados.push((await inscrever(pedido({ ...valido, email: `p${i}@exemplo.com.br` }, "10.9.9.9"), env, verificador)).status);
    }
    expect(estados).toEqual([200, 200, 200, 200, 200, 429]);
    expect(await linhas()).toHaveLength(5);
  });
});

describe("saída", () => {
  it("GET mostra a confirmação sem apagar; POST apaga de fato; o link depois não vale", async () => {
    const { saida } = await (await inscrever(pedido(valido), env, verificador)).json<{ saida: string }>();
    const ver = await sair(new Request(saida), env);
    expect(ver.status).toBe(200);
    expect(await ver.text()).toContain("Sair da lista");
    expect(await linhas()).toHaveLength(1);

    const fim = await sair(new Request(saida, { method: "POST", headers: { origin: SITE } }), env);
    expect(fim.status).toBe(200);
    expect(await fim.text()).toContain("Você saiu da lista");
    expect(await linhas()).toHaveLength(0);
    expect((await env.DB.prepare("SELECT count(*) n FROM saida").first<{ n: number }>())!.n).toBe(0);

    const de_novo = await sair(new Request(saida, { method: "POST", headers: { origin: SITE } }), env);
    expect(de_novo.status).toBe(404);
  });

  it("POST de outra origem não apaga; código malformado é 404", async () => {
    const { saida } = await (await inscrever(pedido(valido), env, verificador)).json<{ saida: string }>();
    expect((await sair(new Request(saida, { method: "POST", headers: { origin: "https://outro.exemplo" } }), env)).status).toBe(403);
    expect(await linhas()).toHaveLength(1);
    expect((await sair(new Request(`${SITE}/sair/curto`), env)).status).toBe(404);
  });
});

describe("retenção", () => {
  it("sem data de lançamento não apaga; 12 meses depois do lançamento apaga tudo", async () => {
    await inscrever(pedido(valido), env, verificador);
    expect(await limpar(env.DB, "", new Date("2030-01-01T00:00:00Z"))).toBe(0);
    expect(await limpar(env.DB, "2027-03-01", new Date("2028-02-29T23:59:59Z"))).toBe(0);
    expect(await linhas()).toHaveLength(1);
    expect(await limpar(env.DB, "2027-03-01", new Date("2028-03-01T00:00:00Z"))).toBe(1);
    expect(await linhas()).toHaveLength(0);
  });
});
