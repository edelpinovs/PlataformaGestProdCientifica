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
npm install                 # también genera el cliente de Prisma
cp .env.example .env.local  # llaves de Supabase de desarrollo
cp .env.example .env        # la CLI de Prisma lee este archivo
npx prisma migrate dev      # aplica las migraciones a tu base de desarrollo
npx prisma db seed          # carga datos ficticios
npm run dev                 # http://localhost:3000
```

Para entrar, crea tu usuario en Supabase (Authentication › Users) y agrega su fila en la tabla `Perfil` con tu rol (`ADMINISTRADOR`, `COORDINADOR` o `DOCENTE`).

### Configurar Supabase Auth (una vez por proyecto de Supabase)

Si no se configura, los correos de invitación llegan con un enlace a `http://localhost:3000/#access_token=...` que no funciona.

1. **Authentication › URL Configuration**
   - *Site URL*: la URL de producción de Vercel, por ejemplo `https://plataforma-gest-prod-cientifica.vercel.app`.
   - *Redirect URLs*: agregar `http://localhost:3000/**` y `https://*-<cuenta-de-vercel>.vercel.app/**` para las vistas previas (el sufijo sale de cualquier URL de vista previa del proyecto). No usar `https://*.vercel.app/**`: aceptaría como destino cualquier app alojada en Vercel.
2. **Authentication › Emails › Templates**: cambiar el enlace de estas plantillas para que pase por `/auth/confirmar`, que valida el enlace en el servidor:
   - *Invite user*: `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=invite`
   - *Reset password*: `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery`

   Quien abre una invitación llega a `/cuenta/contrasena` para definir su contraseña.
3. **Primer administrador** (antes de que exista el despliegue en Vercel): en *Authentication › Users › Add user › Create new user*, crear el usuario con correo y contraseña y marcar *Auto Confirm User*; no se envía correo. Después, en el *SQL Editor*, darle el rol:

   ```sql
   insert into "Perfil" (id, correo, rol)
   values ('<User UID de Authentication › Users>', '<correo>', 'ADMINISTRADOR');
   ```

   La tabla `Perfil` existe después de aplicar la migración inicial (`npx prisma migrate dev`).

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas con Vitest |
| `npm run lint` · `npm run typecheck` | Revisión de estilo y de tipos |
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
