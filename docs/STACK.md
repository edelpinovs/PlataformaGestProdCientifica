# Por qué Next.js + Supabase y no Python

16 de octubre de 2026 · Edel Pino

Proponemos mantener Next.js + Supabase + Prisma en Vercel como stack único del proyecto. Python queda permitido solo para scripts de datos y reportes, nunca como un segundo backend.

## La propuesta y la duda

Se planteó que con Next.js “vamos a programar doble”: el backend en Next y el front en otro framework. No es así. Next.js es React con el backend incluido, así que pantallas, lógica de servidor y consultas viven en un solo proyecto TypeScript y se despliegan juntas.

El PR #49 (panel de inicio), ya integrado en `main`, lo muestra en tres archivos:

| Archivo | Qué es |
| --- | --- |
| `src/components/panel-inicio.tsx` | Front: tarjetas, gráficas, menú |
| `src/lib/inicio.ts` | Backend: conteos consultados en Supabase con Prisma |
| `src/app/page.tsx` | Une ambos en la página de inicio |

Lo que sí duplicaría el trabajo es lo contrario: añadir un backend en Python junto al proyecto actual.

## Por qué este stack

Somos 8 personas, con un semestre y sin presupuesto, y hay que entregar una aplicación funcionando en producción. Este stack reduce al mínimo lo que hay que montar y mantener, así que el tiempo va a los módulos del SDD.

1. **Un lenguaje, un proyecto (Next.js + TypeScript).** Sin dos repositorios, dos despliegues ni un contrato de API que sincronizar. Cada módulo tiene su carpeta y su dueño de punta a punta, de la pantalla a la consulta. Con 8 personas en el mismo código, el `typecheck` del CI detecta errores antes de llegar a producción.
2. **Supabase resuelve base de datos, login y archivos.** Es PostgreSQL con `pg_trgm`, que es lo que pide RF-021 (similitud de títulos). La unicidad de DOI y de código de profesor (RNF-004) la garantiza la base. Login y almacenamiento (RF-016, CU-012) vienen hechos, y el plan gratuito alcanza.
3. **Prisma da un modelo de datos compartido.** `prisma/schema.prisma` es la referencia única de las tablas. Las migraciones van en Git y se revisan en los PR, y si alguien cambia una columna, el CI avisa en todos los módulos que la usan.
4. **Vercel despliega solo.** Cada PR tiene su URL de vista previa para probar sin instalar nada, y fusionar en `main` publica en producción. Sin servidores que administrar y sin costo.
5. **Entrar al proyecto cuesta poco.** En local basta Node y un `.env.local`, sin Docker. React y Next tienen la mayor comunidad y documentación, y son lo más pedido en el mercado laboral.

## Frente a las alternativas

Cualquier alternativa con Python como backend nos deja con dos proyectos y dos lenguajes. Eso sí sería programar doble.

| Alternativa | Proyectos | Lenguajes | Despliegue y hosting | Por qué no aquí |
| --- | --- | --- | --- | --- |
| **Next.js + Supabase (actual)** | 1 | 1 (TypeScript) | Vercel, automático y gratis | — |
| Django o FastAPI + front React | 2 | 2 | Dos despliegues; el de Python hay que configurarlo aparte | API intermedia que mantener; el equipo se reparte entre dos lenguajes |
| Django con plantillas | 1 | 1 (Python) + JS para la interfaz | Hosting propio que contratar y administrar | Tablas con filtros, gráficas y progreso de lotes cuestan más; habría que rehacer lo ya construido |
| React o Vue + Express/NestJS | 2 | 1 | Dos despliegues | Mismo problema de dos proyectos sin ninguna ventaja sobre Next |
| Laravel (PHP) | 1 | 1 (PHP) + JS | Hosting de pago, sin vista previa por PR | El equipo ya trabaja en TypeScript |
| Firebase | 1 | 1 | Gratis | Base no relacional; nuestro dominio necesita relaciones, unicidad y búsqueda por similitud |

Cambiar de stack a mitad de semestre también tiene un costo propio: ya hay en `main` login con roles, catálogos, invitaciones y el panel de inicio.

## Dónde sí cabe Python

Python es una buena herramienta para datos y reportes, y no hay que descartarlo. Puede entrar en dos lugares sin crear un segundo backend:

- **Scripts en `scripts/`**, como los actuales `crear-admin` e `invitar:lote`: importar el Excel de profesores, limpiar datos o generar un reporte puntual con `pandas`. Se conectan a Supabase con `psycopg` y no afectan al despliegue.
- **Una función Python en Vercel**, dentro del mismo proyecto (`api/*.py`), si un reporte o un PDF tiene que verse en la plataforma. Vercel ejecuta Python 3.12 a 3.14 junto a Next.js.

Condiciones para aceptarlo en un PR:

1. **No hay Prisma en Python.** El código usa SQL o `supabase-py`. Si cambia `schema.prisma`, hay que ajustar el Python a mano.
2. **Permisos.** Un endpoint Python valida sesión y rol igual que el código TypeScript. Si no, se salta la regla de que un `DOCENTE` no ve nombres de otros profesores.
3. **CI.** Se añaden `pytest` y `ruff` al workflow `verificar` antes del primer PR con Python.

## Desventajas y cómo se cubren

Ningún stack es gratis. Estas son las limitaciones del nuestro y lo que ya está previsto para cada una en el [plan de trabajo](PLAN_DE_TRABAJO.md):

| Desventaja | Cómo se cubre |
| --- | --- |
| Next.js cambia rápido y trae conceptos nuevos (Server Components, Server Actions) | Revisión de cada PR y la regla de que quien lo abre sabe explicarlo |
| Las funciones de Vercel tienen tiempo máximo y el plan gratuito solo permite crons diarios | Trabajo pesado en lotes con avance guardado en la tabla `jobs` (RNF-001) |
| Supabase gratuito pausa el proyecto tras 7 días sin uso | Uso diario durante el semestre; revisión antes de cada demo |
| Dependemos de dos servicios externos | PostgreSQL y Next.js se pueden mover a otro hosting si hiciera falta |
| Hay código generado con IA que el equipo debe entender | CI obligatorio, prueba manual documentada en `docs/pruebas/` y aprobación de otra persona antes de fusionar |

## Propuesta para el equipo

Proponemos acordar estos cuatro puntos. Los comentarios van en el PR que agrega este documento o en el chat del equipo, antes de la próxima reunión.

1. **Stack único:** Next.js + TypeScript + Supabase + Prisma, desplegado en Vercel, para toda la aplicación.
2. **Python acotado:** solo en `scripts/` o en funciones `api/*.py` para datos y reportes, con las tres condiciones de la sección anterior.
3. **Código explicable:** quien abre un PR debe poder explicar lo que cambia. Si no puede, el PR no se fusiona, venga el código de una persona o de una IA.
4. **Prueba documentada:** cada PR se prueba antes de fusionarlo y la prueba queda registrada en `docs/pruebas/`, como en el [PR #49](pruebas/PR-049-inicio-panel.md).
