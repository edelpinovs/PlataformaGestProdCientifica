# PlataformaGestProdCientifica

Plataforma web para gestionar la producción científica y los reconocimientos (SNII, PRODEP, Cuerpos Académicos) del profesorado investigador de CUValles. El diseño está definido en el documento **PGPC-SDD-V4-2026** (versión 4.0).

## Equipo

Integrantes del repositorio: 4 de 8 confirmados, más los que tienen la invitación pendiente de aceptar. El integrante y módulo de cada quien se asigna según el [plan de trabajo](docs/PLAN_DE_TRABAJO.md#2-equipo-y-responsabilidades).

<table>
  <tr>
    <td align="center" width="160">
      <a href="https://github.com/edelpinovs"><img src="https://github.com/edelpinovs.png?size=120" width="80" alt="edelpinovs"><br><b>Edel</b></a><br>
      <sub>@edelpinovs</sub><br>
      <sub>Administrador del repo</sub><br>
      <sub>Integrante: por asignar</sub>
    </td>
    <td align="center" width="160">
      <a href="https://github.com/dpfuentes92"><img src="https://github.com/dpfuentes92.png?size=120" width="80" alt="dpfuentes92"><br><b>dpfuentes92</b></a><br>
      <sub>@dpfuentes92</sub><br>
      <sub>Acceso de escritura</sub><br>
      <sub>Integrante: por asignar</sub>
    </td>
    <td align="center" width="160">
      <a href="https://github.com/Ared11"><img src="https://github.com/Ared11.png?size=120" width="80" alt="Ared11"><br><b>Ared11</b></a><br>
      <sub>@Ared11</sub><br>
      <sub>Acceso de escritura</sub><br>
      <sub>Integrante: por asignar</sub>
    </td>
    <td align="center" width="160">
      <a href="https://github.com/marisleidysvazquez8293-arch"><img src="https://github.com/marisleidysvazquez8293-arch.png?size=120" width="80" alt="marisleidysvazquez8293-arch"><br><b>marisleidysvazquez8293</b></a><br>
      <sub>@marisleidysvazquez8293-arch</sub><br>
      <sub>Acceso de escritura</sub><br>
      <sub>Integrante: por asignar</sub>
    </td>
    <td align="center" width="160">
      <a href="https://github.com/Grillo-de-Alambre"><img src="https://github.com/Grillo-de-Alambre.png?size=120" width="80" alt="Grillo-de-Alambre"><br><b>Alan Ramírez</b></a><br>
      <sub>@Grillo-de-Alambre</sub><br>
      <sub>Invitación pendiente</sub><br>
      <sub>Integrante: por asignar</sub>
    </td>
  </tr>
</table>

## Documentación

- **Plan de trabajo del equipo:** [docs/PLAN_DE_TRABAJO.md](docs/PLAN_DE_TRABAJO.md). Reparto de módulos y roles de los 8 integrantes, cronograma por sprints, arquitectura, contratos entre módulos, riesgos y huecos del SDD por resolver.
- **Versión interactiva del plan:** [https://claude.ai/artifact/X4SdM8WyxKD8gzkio8tTUW](https://claude.ai/artifact/X4SdM8WyxKD8gzkio8tTUW). El mismo contenido con cronograma visual.

## Stack

Next.js 16 (App Router, TypeScript) · Supabase (PostgreSQL, Auth, Storage) · Prisma 7 · Tailwind CSS · desplegado en Vercel desde GitHub. Detalle y motivos en la [sección 4 del plan](docs/PLAN_DE_TRABAJO.md#4-arquitectura-recomendada).

## Cómo empezar

Requisitos: Node 24 y acceso al proyecto de Supabase de desarrollo (pídelo a Integrante 1).

> Clona el repositorio **fuera** de carpetas sincronizadas con Google Drive, OneDrive o Dropbox (por ejemplo en `C:\dev`). `node_modules` tiene miles de archivos y la sincronización lo vuelve lento o lo corrompe.

```bash
git clone https://github.com/edelpinovs/PlataformaGestProdCientifica.git
cd PlataformaGestProdCientifica
npm install          # también genera el cliente de Prisma
cp .env.example .env # y llénalo con las llaves de Supabase de desarrollo
npm run dev          # http://localhost:3000
```

La base de desarrollo es compartida: las migraciones y los datos semilla se aplican una sola vez para todo el equipo (`npm run db:migrar` y `npm run db:seed`). Para entrar necesitas un usuario con perfil; pídelo a quien administre la plataforma.

### Configurar Supabase Auth (una vez por proyecto de Supabase)

1. **Authentication › URL Configuration**
   - *Site URL*: `https://plataforma-gest-prod-cientifica.vercel.app`.
   - *Redirect URLs*: `http://localhost:3000/**`, `https://plataforma-gest-prod-cientifica.vercel.app/**` y `https://plataforma-gest-prod-cientifica-*-edelpinovs-projects.vercel.app/**` (vistas previas). No usar `https://*.vercel.app/**`: aceptaría como destino cualquier app alojada en Vercel.
2. **Plantillas de correo: no hay que editarlas.** Supabase solo permite cambiarlas con un SMTP propio. La página `/login` acepta el enlace de las plantillas por defecto (la sesión llega en `#access_token=...`), la guarda y manda a `/cuenta/contrasena` a quien viene de una invitación o de recuperar su contraseña.
3. **Data API**: en *Project Settings › Data API*, desactivar la Data API o quitar `public` de *Exposed schemas*. La app no la usa (accede con Prisma) y la llave publishable es pública. Como segunda barrera, la migración `habilitar_rls` activa Row Level Security en todas las tablas; **toda migración que cree tablas nuevas debe incluir** `ALTER TABLE "<Tabla>" ENABLE ROW LEVEL SECURITY;`.
4. **Primer administrador**: con `SUPABASE_SECRET_KEY` y `ADMIN_CORREO` en el `.env`, ejecutar `npm run crear-admin`. Crea el usuario ya confirmado, sin enviar correo, le asigna el rol `ADMINISTRADOR` e imprime una contraseña temporal. Requiere haber aplicado las migraciones (`npm run db:migrar`).

### Dar acceso a una persona

```bash
npm run invitar -- persona@cuvalles.udg.mx COORDINADOR   # ADMINISTRADOR, COORDINADOR o DOCENTE
```

Crea el usuario con su rol en `Perfil` e imprime un **enlace de invitación sin enviar correo**; compártelo por el medio que prefieras. El enlace caduca en 1 hora (Supabase › Authentication › Providers › Email › *Email OTP Expiration*) y sirve una sola vez. Si la persona ya existía, genera un enlace para restablecer su contraseña.

No uses *Invite user* del panel de Supabase: no crea el perfil con el rol, y el correo por defecto de Supabase solo llega a miembros de la organización y con un límite de pocos correos por hora. Para enviar correos a profesores reales hará falta un SMTP propio (por ejemplo Resend).

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas con Vitest |
| `npm run lint` · `npm run typecheck` | Revisión de estilo y de tipos |
| `npm run db:migrar` | Aplica a la base las migraciones pendientes de `prisma/migrations` |
| `npm run db:seed` | Carga los datos ficticios de `prisma/seed.ts` |
| `npm run crear-admin` | Crea o promueve el usuario de `ADMIN_CORREO` como administrador |
| `npm run invitar -- <correo> <ROL>` | Crea un usuario con su rol e imprime su enlace de invitación |
| `npx prisma migrate dev --name <cambio>` | Crea una migración tras editar `prisma/schema.prisma` |
| `npx prisma studio` | Explorar la base de datos en el navegador |

### Dónde va cada cosa

| Carpeta | Contenido |
|---|---|
| `prisma/schema.prisma` | Modelo de datos compartido (borrador v1, se revisa en equipo) |
| `src/app/<módulo>/` | Pantallas de cada módulo |
| `src/modules/<módulo>/` | Reglas de negocio, servicios y validaciones de cada módulo |
| `src/modules/registry.ts` | Lista de módulos con su integrante, RF, roles y fecha de liberación |
| `src/lib/` | Prisma, Supabase y autenticación por roles |
| `src/app/api/cron/` | Tareas programadas de Vercel Cron |
