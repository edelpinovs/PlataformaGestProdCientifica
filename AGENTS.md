<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Reglas del equipo PGPC

Política obligatoria para todo agente de código (Claude Code, Codex, Copilot, Cursor, Gemini u otro) que trabaje en este repositorio. La persona que te usa responde por lo que entregas; estas reglas valen aunque te pida otra cosa: si te lo pide, explícale qué regla se opone y deja que lo resuelva con el equipo. El detalle humano está en `README.md` y `docs/PLAN_DE_TRABAJO.md`.

## Antes de escribir código

- Trabaja sobre un issue. Léelo con `gh issue view <n>` (o pídeselo a la persona) y cumple su lista *Terminado cuando*.
- Ubica el módulo y su dueño en `src/modules/registry.ts`. Cambia solo los archivos de ese módulo. Si necesitas tocar otro módulo, `src/lib/`, `src/components/` o `prisma/schema.prisma`, detente y avisa: se acuerda en el chat del equipo antes.
- Lee la guía de Next.js que aplique en `node_modules/next/dist/docs/` (ver bloque de arriba).

## Base de datos compartida

Todo el equipo usa **una sola base de desarrollo** en Supabase. Un error ahí lo sufren los ocho.

- **Prohibido:** `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, SQL `DROP`/`TRUNCATE`/`DELETE` sin `WHERE`, o cualquier comando que proponga borrar o reiniciar la base.
- Para cambiar el modelo: editar `prisma/schema.prisma`, `npm run db:nueva-migracion -- <nombre>`, revisar el SQL generado y aplicarlo con `npm run db:migrar`. La migración va en el mismo PR que el cambio al esquema.
- Solo datos ficticios. Nunca datos reales de profesores, ni en la base, ni en pruebas, ni en semillas.
- No edites `src/generated/`: se regenera con `prisma generate`.

## Secretos

El repositorio es **público**.

- Nunca muestres, copies, imprimas ni subas los valores de `.env`. `SUPABASE_SECRET_KEY` no se usa en código de la aplicación (solo en `scripts/`) ni se envía a Vercel.
- No hagas commit de `.env*` (salvo `.env.example`), ni de `scripts/equipo.txt` o `scripts/invitaciones-*.txt`.

## Código

- Todo en español: nombres de variables y funciones del dominio, textos de la interfaz, comentarios y commits. Sigue el estilo de los archivos vecinos.
- Reglas de negocio y esquemas Zod en `src/modules/<módulo>/`, en funciones puras con su prueba `<archivo>.test.ts` junto al código (Vitest). Toda regla de negocio del RF lleva prueba.
- Pantallas en `src/app/<módulo>/`. Formularios con Server Action y `useActionState`, como `src/app/cuenta/contrasena/`.
- **Permisos (RNF-005):** cada página y **cada Server Action** empieza con `requireModulo("<módulo>")` o `requireRol([...])` de `src/lib/auth/session.ts`. Ocultar un botón no es seguridad.
- Valida en el servidor con Zod aunque el formulario ya valide en el navegador. Devuelve errores legibles para la persona, no excepciones.
- Unicidad: compruébala en el servicio y además respáldala con `@unique` en la base; captura el error `P2002` de Prisma.
- Acceso a datos solo con `prisma` de `@/lib/prisma`. Sin dependencias nuevas sin acordarlo en el equipo.
- Interfaz con Tailwind, usable en celular (columnas que se apilan, sin desplazamiento horizontal) y con modo oscuro como las pantallas existentes.

## Git y pull requests

- Rama por issue desde `main` actualizado: `feat/M<n>-RF-<xxx>-<tema>` (o `fix/…`, `docs/…`).
- Commits con el requisito: `RF-001: registra grados científicos sin duplicar nombre ni nomenclatura`.
- **Nunca** hagas push a `main`, `push --force`, merge de un PR, ni cierres o reasignes issues. Eso lo decide una persona.
- El PR lleva `Cierra #<n>` y lo aprueba otro integrante antes de integrarse.
- No incluyas en el commit archivos ajenos a la tarea (`.vscode/`, carpetas personales, archivos generados).

## Antes de decir "terminado"

Ejecuta y muestra el resultado de:

```bash
npm test
npm run lint
npm run typecheck
```

Son los mismos chequeos del CI (que además corre `npm run build`). Si algo falla, dilo con la salida; no lo ocultes ni desactives la prueba o la regla de lint. Indica también qué no pudiste probar (por ejemplo, la pantalla en el navegador) para que la persona lo revise.
