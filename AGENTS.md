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
- Interfaz con Tailwind, usable en celular (columnas que se apilan, sin desplazamiento horizontal) y siguiendo la sección *Diseño visual*.

## Diseño visual

Toda pantalla sigue la pauta de `docs/diseno/PAUTA_VISUAL.md` (léela antes de crear o cambiar una pantalla). La prueba `src/components/pauta-visual.test.ts` la hace cumplir en el CI: si falla, corrige el código; no la desactives ni la edites para que pase.

- **Estructura:** toda página con sesión va dentro de `<Marco>` de `@/components/marco` (menú lateral, título, usuario), con `activo` igual al slug del módulo. Subpáginas con `volver={{ href, texto }}`. Las pantallas sin sesión usan `<PantallaAcceso>`. No crees otro encabezado ni otro menú.
- **Piezas:** usa las de `@/components/ui` antes de escribir clases: `Panel`, `EstadoVacio`, `Aviso`, `EtiquetaEstado`, `Icono`, `claseBoton`, `claseCampo(conError)`, `claseEtiqueta`, `claseTabla`. Si falta una pieza que se repetirá, agrégala ahí (es un cambio en `src/components/`: avísalo).
- **Colores solo por nombre** (definidos en `src/app/globals.css`): `bg-fondo`, `bg-superficie`, `bg-superficie-alt`, `bg-marca`, `text-sobre-marca`, `bg-marca-suave`, `bg-marca-tenue`, `hover:bg-hover`, `border-linea`, `text-texto`, `text-texto-2`, `text-texto-3`, `text-exito`/`bg-exito-suave`, `text-aviso`/`bg-aviso-suave`, `text-peligro`/`bg-peligro-suave`. En `style` usa `var(--marca)`, etc.
- **Prohibido en `.tsx`:** hexadecimales (`#443CDE`), `rgb()`/`hsl()`, colores de la paleta de Tailwind (`teal-700`, `neutral-500`, `red-600`, `text-white`…) y colores con `dark:`. Un color nuevo se agrega en `globals.css` con su versión clara y oscura, con contraste AA (4.5:1) en ambas.
- **Tema oscuro:** lo elige cada persona desde el menú (cookie `tema`). No lo actives según el sistema operativo ni escribas variantes oscuras a mano: los colores con nombre ya cambian solos.
- **Forma:** paneles `rounded-2xl` sin borde ni sombra; botones, campos y enlaces del menú `rounded-xl`; etiquetas de estado `rounded-full`. Separación `gap-4` dentro de una sección y `gap-5` entre secciones (la da `Marco`).
- **Texto:** título de página en `Marco` (no pongas otro `<h1>`); títulos de panel `text-base font-semibold`; notas y subtítulos `text-xs` o `text-sm` en `text-texto-3`. Mensajes en español, cortos y sin culpar a la persona.
- **Accesibilidad:** cada campo dentro de su `<label>`, `aria-invalid` en el campo con error, errores con `<Aviso tipo="error">` (anuncia con `role="alert"`), iconos decorativos con `aria-hidden`.
- **Antes de entregar una pantalla** revisa en el navegador: tema claro, tema oscuro (botón *Tema oscuro* del menú) y vista de celular. Si no pudiste verla, dilo.

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
