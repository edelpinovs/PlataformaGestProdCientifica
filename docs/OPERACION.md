# Operación de la plataforma

Guía para quien administra la infraestructura (Supabase, Vercel, GitHub y accesos). El resto del equipo trabaja con el [README](../README.md).

- **Producción:** https://plataforma-gest-prod-cientifica.vercel.app
- **Vercel:** proyecto `plataforma-gest-prod-cientifica` en la cuenta `edelpinovs-projects`. Cada push a `main` despliega a producción y cada PR tiene su vista previa.
- **Supabase (desarrollo):** proyecto `qvyvzrejlukzhbetudix`, región `us-west-2`.

## Variables de entorno

| Variable | `.env` del equipo | `.env` de quien opera | Vercel |
|---|:-:|:-:|:-:|
| `DATABASE_URL` (pooler 6543, `?pgbouncer=true`) | ✓ | ✓ | ✓ |
| `DIRECT_URL` (pooler 5432) | ✓ | ✓ | |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✓ | ✓ | ✓ |
| `CRON_SECRET` | ✓ | ✓ | ✓ |
| `SUPABASE_SECRET_KEY` | | ✓ | |
| `ADMIN_CORREO` · `SITIO_URL` | | ✓ | |

Entrega el `.env` del equipo por un canal privado, nunca por el chat del grupo, issues o commits: el repositorio es público. `SUPABASE_SECRET_KEY` da control total sobre los usuarios; no sale de tu máquina.

## Supabase Auth (una vez por proyecto)

1. **Authentication › URL Configuration**
   - *Site URL:* `https://plataforma-gest-prod-cientifica.vercel.app`
   - *Redirect URLs:* `http://localhost:3000/**`, `https://plataforma-gest-prod-cientifica.vercel.app/**` y `https://plataforma-gest-prod-cientifica-*-edelpinovs-projects.vercel.app/**`. No usar `https://*.vercel.app/**`: aceptaría como destino cualquier app alojada en Vercel.
2. **Plantillas de correo:** no se editan (Supabase lo exige con SMTP propio). `/login` acepta el enlace de las plantillas por defecto.
3. **Data API** (*Project Settings › Data API*): desactivada. La app no la usa y la llave publishable es pública. Además, todas las tablas tienen RLS (migración `habilitar_rls`, y `npm run db:nueva-migracion` lo agrega a cada tabla nueva).

## Accesos a la plataforma

Los enlaces se generan **sin enviar correo**: compártelos por el medio que prefieras. Cada uno sirve una vez y caduca en 1 hora (*Authentication › Providers › Email › Email OTP Expiration*). Si la persona ya existía, se genera un enlace para restablecer su contraseña.

**Por lotes:**

1. Copia `scripts/equipo.ejemplo.txt` como `scripts/equipo.txt` (está en `.gitignore`) y escribe un correo por línea, con rol opcional: `correo [ADMINISTRADOR|COORDINADOR|DOCENTE]`. Sin rol se usa `ADMINISTRADOR`.
2. Ejecuta `npm run invitar:lote`. Los enlaces quedan en `scripts/invitaciones-<fecha>.txt` (también ignorado).
3. Comenta con `#` a quien ya aceptó y vuelve a ejecutarlo cuando haga falta: solo invita las líneas activas.

**Contraseñas temporales (recomendado si los enlaces dan problemas):** `npm run invitar:lote -- --contrasena` deja cada cuenta confirmada con una contraseña temporal y su rol, y las guarda en `scripts/invitaciones-contrasenas-<fecha>.txt`. No caducan. Cada persona entra con su correo y esa contraseña y la cambia en *Cambiar contraseña*. Reemplaza la contraseña que la persona tuviera.

**Una persona:** `npm run invitar -- persona@alumnos.udg.mx COORDINADOR`

**Primer administrador de un proyecto nuevo:** `npm run crear-admin` (usa `ADMIN_CORREO`; imprime una contraseña temporal).

No uses *Invite user* del panel de Supabase: no crea el `Perfil` con el rol, y el correo por defecto de Supabase solo llega a miembros de la organización, con un límite de pocos correos por hora. Para enviar correos a profesores reales hará falta un SMTP propio (por ejemplo Resend).

**Panel de Supabase:** invita como *Developer* (*Organization › Team*) solo a quien administre la base. Para programar basta el `.env` del equipo.

## GitHub

- `main` está protegida: requiere PR, CI en verde (`verificar`) y una aprobación. El administrador del repositorio puede saltarse la aprobación si es urgente.
- El tablero está en *Issues*: un issue por RF con etiqueta de módulo y milestone por fecha de liberación. Asigna cada issue al integrante responsable.

## Base de datos compartida

- Todos desarrollan contra la misma base. Las migraciones se crean con `npm run db:nueva-migracion` y se aplican con `npm run db:migrar`. Nadie debe ejecutar `prisma migrate dev` ni `prisma migrate reset`: pueden proponer borrar la base completa.
- Si una migración falla a medias, revisa `_prisma_migrations` y resuélvelo con `npx prisma migrate resolve`.
- Datos semilla: `npm run db:seed`. Solo datos ficticios; nunca listados reales de profesores.
