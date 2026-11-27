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
| Domínios do projeto | `brandoc.com.br` e `www.brandoc.com.br` adicionados; esperam os CNAME (o login do wrangler não escreve DNS) |

## Desvio do plano

- **Limite por IP:** a Pages recusa o binding de rate limit na publicação ("Configuration file for Pages projects does
  not support ratelimits"). O binding fica no Worker `brandoc-lista-limpeza`, que expõe o entrypoint `Limitador`; a
  Pages Function chama por ligação de serviço (RPC), com a mesma interface `limit({ key })`. Sem custo extra além das
  invocações do plano gratuito.
- No ar, numa rajada de 25 pedidos inválidos do mesmo IP, os 429 começaram no 13º. O limitador da Cloudflare é
  aproximado (conta por data center), por isso não corta exatamente no 6º como nos testes.
