# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Las reglas obligatorias del equipo están en `AGENTS.md` (importado arriba) y mandan sobre este archivo. Aquí solo va lo que ayuda a orientarse rápido en el código.

## Comandos

```bash
npm run dev                  # http://localhost:3000 (necesita .env; pídelo, nunca lo muestres)
npm test                     # Vitest, todas las pruebas
npx vitest run grados        # solo los archivos de prueba cuyo nombre coincide
npm run lint                 # ESLint
npm run typecheck            # next typegen + tsc --noEmit
npm run build                # el CI también lo corre
npm run db:migrar            # prisma migrate deploy: aplica migraciones pendientes (seguro)
npm run db:nueva-migracion -- <nombre>   # genera el SQL desde schema.prisma y activa RLS en tablas nuevas
```

El CI (`.github/workflows/`) corre, en este orden: `prisma validate`, lint, typecheck, test y build, con variables de entorno de relleno (el build no toca la base).

## Arquitectura

Next.js 16 (App Router) + Prisma 7 sobre PostgreSQL de Supabase + Supabase Auth + Tailwind 4 + Zod 4. Lee `node_modules/next/dist/docs/` antes de usar APIs de Next: esta versión cambia convenciones (por ejemplo, el middleware es `src/proxy.ts` con `export function proxy`).

**Módulos.** La aplicación se reparte en módulos del SDD (PGPC-SDD-V4-2026), declarados en `src/modules/registry.ts` con su `slug`, dueño, requisitos (RF) y `roles` con acceso. Cada módulo tiene dos carpetas:
- `src/modules/<slug>/`: lógica pura y esquemas Zod, sin Prisma ni Next, con su `.test.ts` al lado. Las funciones reciben los datos ya consultados (p. ej. `buscarDuplicado(nuevo, catalogo, idPropio)`) para poder probarlas sin base. Utilidades compartidas del módulo en archivos como `catalogos/comun.ts` (`limpiar`, `normalizar` para comparar sin acentos ni mayúsculas).
- `src/app/<slug>/`: `page.tsx` (Server Component), `actions.ts` (`"use server"`), y componentes cliente (`formulario.tsx`, `fila.tsx`) con `useActionState`. Cada Server Action devuelve un objeto de estado (`{ error, campo, valores, ... }`) en vez de lanzar, y llama a `revalidatePath` tras escribir.

El patrón completo de alta/edición/borrado está en `src/app/catalogos/grados/` + `src/modules/catalogos/grados.ts`: cópialo para listados nuevos.

**Autenticación y permisos, en dos capas:**
1. `src/proxy.ts` refresca la sesión de Supabase y manda a `/login` a quien no la tiene (públicas: `/login`, `/auth`; `/api/cron/*` queda fuera y se protege con `CRON_SECRET`).
2. `requireModulo(slug)` / `requireRol(roles)` de `src/lib/auth/session.ts` leen el `Perfil` (Prisma, `id` = uuid de `auth.users`) y redirigen si el rol no está en `registry.ts`. Los roles (`ADMINISTRADOR`, `COORDINADOR`, `DOCENTE`) viven en `src/lib/auth/roles.ts` y deben coincidir con el enum `Rol` del esquema.

**Base de datos.** `prisma/schema.prisma` es el modelo de todo el equipo, organizado por secciones con el integrante dueño. El cliente se genera en `src/generated/prisma` (se importa `@/generated/prisma/client`, p. ej. `Prisma.PrismaClientKnownRequestError`). La app conecta con el pooler (`DATABASE_URL`, adaptador `@prisma/adapter-pg` en `src/lib/prisma.ts`); la CLI usa la conexión directa (`DIRECT_URL`, en `prisma.config.ts`). Semilla en `prisma/seed.ts` (`npm run db:seed`).

**Tareas en segundo plano.** Vercel Cron llama a `/api/cron/escaneo` a diario (`vercel.json`); el modelo `Job` del esquema registra su avance.

**Interfaz.** Toda página con sesión va en `<Marco activo="<slug>">` (`src/components/marco.tsx`) y usa las piezas de `src/components/ui.tsx`. `src/components/pauta-visual.test.ts` revisa los `.tsx` en busca de colores prohibidos y otras violaciones de `docs/diseno/PAUTA_VISUAL.md`.

**Scripts de administración** (`scripts/`, con `tsx`): `crear-admin`, `invitar`, `invitar:lote`. Son los únicos lugares donde se usa `SUPABASE_SECRET_KEY`.

## Documentación

- `docs/PLAN_DE_TRABAJO.md`: reparto, entregas entre módulos y arquitectura.
- `docs/OPERACION.md`: infraestructura (Vercel, Supabase) y accesos.
- `docs/diseno/PAUTA_VISUAL.md`: pauta visual con plantilla de pantalla nueva.
- `docs/pruebas/`: registros de prueba de los PR.
