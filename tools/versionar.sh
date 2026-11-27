#!/bin/sh
# Põe o hash do conteúdo no endereço do CSS e do JS (estilo.css?v=…), para a cache do navegador (Browser Cache TTL da
# zona, 4 h) não juntar HTML novo com CSS antigo. Rode antes de cada publicação (npm run publicar já roda).
set -eu
cd "$(dirname "$0")/.."
css=$(shasum -a 256 publico/estilo.css | cut -c1-10)
js=$(shasum -a 256 publico/site.js | cut -c1-10)
for f in publico/index.html publico/privacidade.html src/lista.ts; do
  sed -i '' -E "s#/estilo\.css(\?v=[0-9a-f]+)?\"#/estilo.css?v=$css\"#g; s#/site\.js(\?v=[0-9a-f]+)?\"#/site.js?v=$js\"#g" "$f"
done
echo "estilo.css?v=$css site.js?v=$js"
