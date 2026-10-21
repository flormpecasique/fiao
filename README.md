# Fiao · Cuaderno de fiado

Proyecto: **Flor**

Libreta digital de fiado para bodegas, abastos y emprendedores en Venezuela.

- Clientes con su saldo en **$ y Bs**, calculado con la **tasa del día** que pone el usuario.
- Fiados y abonos en cualquiera de las dos monedas (se guardan en $ con la tasa usada).
- Aviso de **atrasados** (más de 15 días sin abonar).
- Botón **Cobrar por WhatsApp** con el mensaje listo: saldo, monto en Bs y últimos fiados.
- **Funciona sin internet** (PWA): se instala en el teléfono como una app.
- Respaldo: descargar y cargar un archivo `.json`.
- Sin servidor, sin base de datos, sin cuentas: los datos viven en el teléfono.

## Estructura

```
src/app.html      ← código de la app (se edita aquí)
build.sh          ← genera public/index.html desde src/app.html
public/           ← lo que publica Vercel
  index.html
  sw.js           ← modo sin internet
  manifest.webmanifest
  icon.svg
vercel.json
```

Después de editar `src/app.html`, ejecuta `sh build.sh` antes de subir los cambios.

## Despliegue (unos 5 minutos)

1. **GitHub:** crea un repositorio nuevo (por ejemplo `fiao`) y sube esta carpeta:
   ```bash
   git init && git add . && git commit -m "Fiao v1"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/fiao.git
   git push -u origin main
   ```
2. **Vercel:** entra en vercel.com → *Add New → Project* → importa el repositorio → *Deploy*.
   No hace falta configurar nada: `vercel.json` ya indica la carpeta `public`.
3. **Dominio (cuando esté validada):** en Vercel → *Settings → Domains*.

Cada `git push` a `main` publica una versión nueva automáticamente.

## Instalar en el teléfono

Abre el link en Chrome (Android) → menú ⋮ → *Agregar a pantalla principal*.
En iPhone: Safari → Compartir → *Agregar a inicio*.

## Siguientes pasos (cuando haya usuarios)

- Plan pago ($3–5/mes): respaldo automático en la nube y varios teléfonos por negocio (Supabase).
- Recordatorio semanal de cobro a los atrasados.
- Tasa BCV sugerida automáticamente (con opción de usar la propia).
- Recibo de abono para enviar por WhatsApp.
