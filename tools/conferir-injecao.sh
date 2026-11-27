#!/bin/sh
# Confere que a Cloudflare não injeta script (Web Analytics, Rocket Loader etc.) no HTML servido.
# Rode a cada publicação de Worker ou Pages. A injeção só acontece para navegador, por isso os cabeçalhos abaixo.
# Uso: tools/conferir-injecao.sh [url ...]   (sem argumentos: o site e a página de confirmação)
set -u
[ $# -eq 0 ] && set -- https://brandoc.com.br/ https://brandoc.com.br/privacidade https://c.brandoc.com.br/AAAAAAAAAAAAAAAAAAAAAA
falhou=0
for url in "$@"; do
  html=$(curl -s -H "Accept: text/html,application/xhtml+xml" -H "Cache-Control: no-cache" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36" "$url")
  if [ -z "$html" ]; then echo "SEM RESPOSTA  $url"; falhou=1; continue; fi
  achados=$(printf '%s' "$html" | grep -o -i -E 'cloudflareinsights|/cdn-cgi/[a-z_/.-]*\.js|rocket-loader|email-decode' | sort -u | tr '\n' ' ')
  if [ -n "$achados" ]; then echo "INJETADO      $url: $achados"; falhou=1; else echo "ok            $url"; fi
done
exit $falhou
