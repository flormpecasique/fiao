#!/usr/bin/env sh
# Fiao · genera el sitio en public/ a partir de src/.
# Vercel lo ejecuta en cada despliegue (ver vercel.json). En local: sh build.sh
#
# Dominio: se toma de SITE_URL si existe; si no, del dominio de producción que da Vercel
# (VERCEL_PROJECT_PRODUCTION_URL). Al conectar un dominio propio en Vercel, se usa solo.
set -eu
cd "$(dirname "$0")"

SITE_URL="${SITE_URL:-}"
if [ -z "$SITE_URL" ] && [ -n "${VERCEL_PROJECT_PRODUCTION_URL:-}" ]; then SITE_URL="https://$VERCEL_PROJECT_PRODUCTION_URL"; fi
if [ -z "$SITE_URL" ] && [ -n "${VERCEL_URL:-}" ]; then SITE_URL="https://$VERCEL_URL"; fi
if [ -z "$SITE_URL" ]; then SITE_URL="https://fiao.vercel.app"; fi
SITE_URL="${SITE_URL%/}"

# Número de WhatsApp para sugerencias (solo dígitos, con código de país: 58412...). Vacío = botón oculto.
FEEDBACK="$(printf '%s' "${FEEDBACK_WHATSAPP:-}" | tr -cd '0-9')"

VERSION="$(cat src/app.html src/fonts.css src/sw.js | cksum | cut -d' ' -f1)"
TODAY="$(date -u +%Y-%m-%d)"
OUT=public
mkdir -p "$OUT"

# 1) Estilos: tipografías propias + estilos de la app
{ cat src/fonts.css; awk '/^<style>$/{f=1;next} /^<\/style>$/{f=0} f' src/app.html; } > "$OUT/app.css"

# 2) Código de la app
awk '/^<script>$/{f=1;next} /^<\/script>$/{f=0} f' src/app.html > "$OUT/app.js"

# 3) Página: cabecera SEO + contenido + código (sin nada en línea, para una política de seguridad estricta)
{
  sed -e "s|%SITE_URL%|$SITE_URL|g" -e "s|%VERSION%|$VERSION|g" -e "s|%FEEDBACK%|$FEEDBACK|g" src/head.html
  awk '/^<\/style>$/{f=1;next} /^<script>$/{f=0} f' src/app.html
  printf '<script src="/app.js?v=%s" defer></script>\n</body>\n</html>\n' "$VERSION"
} > "$OUT/index.html"

# 4) Modo sin internet
sed -e "s|%VERSION%|$VERSION|g" src/sw.js > "$OUT/sw.js"

# 5) Buscadores
printf 'User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n' "$SITE_URL" > "$OUT/robots.txt"
cat > "$OUT/sitemap.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>$SITE_URL/</loc><lastmod>$TODAY</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
</urlset>
EOF

echo "Fiao listo en $OUT/ · dominio $SITE_URL · versión $VERSION"
