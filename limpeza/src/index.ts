// Worker auxiliar da lista de espera (a Pages Function não tem gatilho agendado nem aceita o binding de rate limit):
// - scheduled: retenção (apaga a lista 12 meses depois do lançamento);
// - Limitador: o limite por IP, chamado pela Pages Function por ligação de serviço (RPC). Sem rota pública.
import { WorkerEntrypoint } from "cloudflare:workers";
import { limpar } from "./limpar";

interface Env { DB: D1Database; LANCAMENTO: string; LIMITE_POR_IP: RateLimit }

export class Limitador extends WorkerEntrypoint<Env> {
  limit(opcoes: { key: string }) {
    return this.env.LIMITE_POR_IP.limit(opcoes);
  }
}

export default {
  async fetch() {
    return new Response(null, { status: 404 });
  },
  async scheduled(_evento, env) {
    await limpar(env.DB, env.LANCAMENTO);
  },
} satisfies ExportedHandler<Env>;
