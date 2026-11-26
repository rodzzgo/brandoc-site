// Worker só de limpeza: a Pages Function não tem gatilho agendado.
import { limpar } from "./limpar";

interface Env { DB: D1Database; LANCAMENTO: string }

export default {
  async scheduled(_evento, env) {
    await limpar(env.DB, env.LANCAMENTO);
  },
} satisfies ExportedHandler<Env>;
