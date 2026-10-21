# Fiao · Libreta de fiado

Proyecto: **Flor** · Creado por **Flor Peña**

Cuaderno de fiado digital para bodegas, abastos y emprendedores en Venezuela.

- Clientes con su saldo en **$ y Bs**, con la **tasa del día** que pone el usuario.
- Fiados y abonos en cualquiera de las dos monedas.
- Aviso de **atrasados** (más de 15 días sin abonar).
- **Cobrar por WhatsApp** con el mensaje listo.
- **Funciona sin internet** y se instala como app (PWA).
- Respaldo en archivo `.json`.
- Sin servidor, sin base de datos y sin cuentas: los datos viven en el dispositivo.

## Estructura

```
src/                 ← aquí se edita
  app.html           ← la app (estilos, contenido y código)
  head.html          ← cabecera: SEO, vista previa al compartir, datos para Google
  fonts.css          ← tipografías propias
  sw.js              ← modo sin internet
build.sh             ← genera public/ a partir de src/ (Vercel lo ejecuta solo)
public/              ← lo que se publica
  fonts/             ← tipografías recortadas al español (woff2) y sus licencias OFL
  og.png             ← imagen al compartir el link (1200×630)
  icon-*.png, apple-touch-icon.png, favicon.ico, icon.svg
  screenshot-*.png   ← capturas para la instalación como app
  manifest.webmanifest
vercel.json          ← compilación, caché y cabeceras de seguridad
```

## Cómo se publica

Vercel ejecuta `sh build.sh` en cada `git push` a `main`. El script:

1. Separa estilos y código en `app.css` y `app.js` (nada en línea, para una política de seguridad estricta).
2. Escribe en la página el **dominio real** (canonical, Open Graph, sitemap, robots), tomado de
   `VERCEL_PROJECT_PRODUCTION_URL`. Al conectar un dominio propio en Vercel, se usa automáticamente
   en el siguiente despliegue. También se puede fijar con la variable de entorno `SITE_URL`.
3. Pone una versión nueva a los archivos para que nadie vea una copia vieja.

En Vercel no hay que configurar nada: `vercel.json` ya indica el comando y la carpeta.

## Al conectar el dominio

1. Vercel → *Settings → Domains* → añade el dominio.
2. Vuelve a desplegar (*Deployments → Redeploy*) para que la página use el dominio nuevo.
3. Comprueba la imagen al compartir en https://www.opengraph.xyz/ y
   https://developers.facebook.com/tools/debug/ (este último también refresca la caché de WhatsApp).
4. Da de alta el sitio en Google Search Console y envía `/sitemap.xml`.

## Seguridad

- Todo lo que escribe el usuario se muestra escapado; no se puede inyectar código.
- Los respaldos se validan campo por campo antes de cargarse.
- Cabeceras: CSP estricta (solo código del propio sitio), HSTS, `nosniff`, sin incrustar en otras webs,
  sin acceso a cámara, micrófono ni ubicación.
- No hay servidor ni base de datos que atacar, y los datos no salen del dispositivo.

## Siguientes pasos (cuando haya usuarios)

- Plan pago: respaldo automático en la nube y varios dispositivos por negocio.
- Recordatorio semanal de cobro a los atrasados.
- Tasa BCV sugerida automáticamente.
- Recibo de abono para enviar por WhatsApp.
