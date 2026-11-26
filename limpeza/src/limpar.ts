/** Retenção da lista: apaga tudo 12 meses depois do lançamento. Sem data de lançamento, não apaga nada. */
export async function limpar(db: D1Database, lancamento: string, agora = new Date()): Promise<number> {
  if (!lancamento) return 0;
  const limite = new Date(`${lancamento}T00:00:00Z`);
  limite.setUTCFullYear(limite.getUTCFullYear() + 1);
  if (agora < limite) return 0;
  const r = await db.prepare("DELETE FROM inscricao RETURNING id").all(); // as saídas somem junto (ON DELETE CASCADE)
  return r.results.length;
}
