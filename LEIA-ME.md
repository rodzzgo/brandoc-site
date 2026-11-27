# Site do Brandoc

- `publico/`: o site estático (Cloudflare Pages, envio direto). `functions/`: a lista de espera (Pages Function).
- `src/lista.ts`: inscrição e saída. `migrations/`: o D1 `brandoc-lista`. `limpeza/`: Worker com o limite por IP (a
  Pages não aceita o binding de rate limit) e o gatilho diário
  que apaga a lista 12 meses depois do lançamento (a Pages Function não tem gatilho agendado).
- O `main` é o que o GitHub Pages serve hoje (páginas provisórias). Não mexa nele até a troca de domínio.

## Rodar local

```sh
npm ci
cp .dev.vars.exemplo .dev.vars   # chave secreta de TESTE do Turnstile
npx wrangler dev -c limpeza/wrangler.jsonc   # noutro terminal: o limitador por IP (RPC)
npm run local                    # http://localhost:8788, com D1 local
npm run testar                   # testes da função
npm run verificar                # tipos
```

Publicação e recursos na conta: `docs/publicacao.md`. A chave do Turnstile em `publico/index.html` é a de
produção (só vale em brandoc.com.br); para testar local, troque pela de teste `1x00000000000000000000AA`.
