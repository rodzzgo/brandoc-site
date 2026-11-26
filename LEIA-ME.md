# Site do Brandoc

- `publico/`: o site estático (Cloudflare Pages, envio direto). `functions/`: a lista de espera (Pages Function).
- `src/lista.ts`: inscrição e saída. `migrations/`: o D1 `brandoc-lista`. `limpeza/`: Worker com o gatilho diário
  que apaga a lista 12 meses depois do lançamento (a Pages Function não tem gatilho agendado).
- O `main` é o que o GitHub Pages serve hoje (páginas provisórias). Não mexa nele até a troca de domínio.

## Rodar local

```sh
npm ci
cp .dev.vars.exemplo .dev.vars   # chave secreta de TESTE do Turnstile
npm run local                    # http://localhost:8788, com D1 local
npm run testar                   # testes da função
npm run verificar                # tipos
```

Nada disto existe na conta da Cloudflare: o banco, o projeto Pages, as chaves do Turnstile e o Worker de limpeza
são criados só na publicação. Os `database_id` zerados e a `data-sitekey` de teste em `publico/index.html` são
trocados nessa hora.
