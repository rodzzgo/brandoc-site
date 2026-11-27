# Publicação do site em brandoc.com.br (27/11/2026)

Autorizada no recado de 27/11/2026, 00:32. Tudo no plano gratuito; nada pediu cartão.

## Antes

| Recurso | Estado |
| --- | --- |
| D1 | só `brandoc-confirmacao` |
| Pages | nenhum projeto |
| Workers | `brandoc-atualizacao`, `brandoc-confirmacao` |
| Turnstile | nenhum widget |
| Zona `brandoc.com.br` | plano Free; raiz e `www` sem registro; MX do Email Routing |
| `c.brandoc.com.br/robots.txt` | 200 |
| `atualizacao.brandoc.com.br/BranDoc-win-x64-Setup.exe` | 200 |

## Depois

| Recurso | Estado |
| --- | --- |
| D1 `brandoc-lista` | `568bc97f-c223-420d-997d-6810706a0d45` (ENAM); migração `0001_inscricao` aplicada; tabelas `inscricao` e `saida`, índice `saida_inscricao` |
| Worker `brandoc-lista-limpeza` | versão `ba1df70c-98d8-4394-917d-754330022a4a`; cron `23 4 * * *`; `LANCAMENTO` vazio; rate limit `LIMITE_POR_IP` (5 por 60 s, namespace 12001); sem rota pública (`workers_dev: false`) |
| Pages `brandoc-site` | envio direto, branch de produção `main`; primeira publicação `b942d22f` (commit `e03a5b4` do `site-novo`) |
| Segredo `TURNSTILE_SECRET` | gravado no projeto por pipe direto da API, sem passar por tela, recado ou log |
| Turnstile | widget "brandoc-site lista de espera", modo gerenciado, domínio `brandoc.com.br`, chave pública `0x4AAAAAAGU_yNHyP7aHL7VP` |
| Domínios do projeto | `brandoc.com.br` e `www.brandoc.com.br` ativos, com certificado; CNAME `@` e `www` para `brandoc-site.pages.dev` (proxy) criados pelo Rodrigo no painel |
| Regra `www` → raiz | 301 mantendo caminho e parâmetros, criada pelo Rodrigo (modelo "Redirect from WWW to root") |
| Web Analytics da zona | Desligado pelo Rodrigo: injetava o beacon em todas as páginas HTML da zona, inclusive `c.` (a CSP bloqueava; nada foi enviado) |
| Publicações | `b942d22f` (primeira), `8f5bb191` (telas na largura da página e sem o selo, commit `f40edae`) |
| `c.brandoc.com.br/robots.txt` e Setup em `atualizacao.` | 200, como antes |

## Desvio do plano

- **Limite por IP:** a Pages recusa o binding de rate limit na publicação ("Configuration file for Pages projects does
  not support ratelimits"). O binding fica no Worker `brandoc-lista-limpeza`, que expõe o entrypoint `Limitador`; a
  Pages Function chama por ligação de serviço (RPC), com a mesma interface `limit({ key })`. Sem custo extra além das
  invocações do plano gratuito.
- No ar, numa rajada de 25 pedidos inválidos do mesmo IP, os 429 começaram no 13º. O limitador da Cloudflare é
  aproximado (conta por data center), por isso não corta exatamente no 6º como nos testes.

## Conferência no ar (brandoc.com.br)

- `/`, `/privacidade` 200; `/privacidade.html` 308 para `/privacidade`; `og:image`, fontes, `robots.txt` e
  `sitemap.xml` 200; código de saída inexistente 404.
- `www.brandoc.com.br/privacidade?x=1` → 301 `https://brandoc.com.br/privacidade?x=1`; `http` → 301 `https`.
- Cabeçalhos: HSTS, CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, `nosniff`.
- Chrome, temas claro e escuro: fontes carregadas, sem erro de console nem de CSP (depois do Web Analytics desligado).
- Inscrição e saída: o Turnstile gerenciado barra o navegador automatizado (headless e com janela), como deve. O
  Rodrigo inscreveu um e-mail de teste no navegador dele (tabela com 1 inscrição e 1 código de saída, 01:30 UTC) e saiu
  pelo link; contagem final: 0 inscrições, 0 saídas.

## Incidentes durante a publicação

- Os domínios ficaram em "CNAME record not set": os primeiros registros não eram CNAME para `brandoc-site.pages.dev`;
  depois de apagados, a raiz e o `www` ficaram alguns minutos sem registro (530 e sem resolução). Refeitos à mão, a
  Pages validou em seguida. `c.`, `atualizacao.` e os MX não foram afetados em nenhum momento.
