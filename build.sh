#!/usr/bin/env sh
# Genera public/index.html (página completa) a partir de src/app.html.
set -e
cd "$(dirname "$0")"
{
  printf '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  sed -n '1,/<\/style>/p' src/app.html
  printf '</head>\n<body>\n'
  sed -n '/<\/style>/,$p' src/app.html | tail -n +2
  printf '</body>\n</html>\n'
} > public/index.html
echo "public/index.html listo"
