# Issue #226: accesos frecuentes en Mi cuenta (D-237)

Fecha: 2026-11-17. Rama: `feat/transversal-accesos-frecuentes`, apilada sobre `feat/transversal-mi-cuenta` ([PR #227](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/227)), de la que depende por la página `/cuenta`. Transversal; la preparó I1. **Cambia el esquema** (migración incluida).

## Qué cambia

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | Nuevo modelo `AccesoModulo` (perfil, módulo, conteo, último acceso; única por perfil y módulo; borrado en cascada con el perfil) y la relación `accesos` en `Perfil` |
| `prisma/migrations/20261117173805_accesos_modulo/` | Solo aditiva: `CREATE TABLE`, índice único y llave foránea. Con RLS activado y `REVOKE` a `anon` y `authenticated`, como `ConfiguracionScopus`. Ningún `DROP` |
| `src/modules/cuenta/accesos.ts` | Reglas puras: módulo registrable por rol, ventana de 30 minutos, ranking, texto de visitas |
| `src/app/cuenta/actions.ts` | `registrarAcceso`: `requireRol` de los tres roles, valida el slug contra el rol real, aplica la ventana en el servidor y no propaga fallas |
| `src/components/registro-acceso.tsx`, `marco.tsx` | **Piezas compartidas.** `Marco` monta `RegistroAcceso` solo en los módulos del registro (no en Inicio ni Mi cuenta); avisa en segundo plano y recuerda la última visita en `sessionStorage` |
| `src/app/cuenta/accesos-frecuentes.tsx`, `page.tsx` | Panel con los 4 módulos más usados o, sin historial, un estado vacío y los módulos del rol |
| `docs/DECISIONES.md`, `docs/diseno/PAUTA_VISUAL.md` | D-237 (pendiente) y la tabla de archivos |

## Comprobaciones

| Control | Resultado |
|---|---|
| `npm test` | todas pasan; 26 nuevas (`accesos.test.ts`, `registrarAcceso` en `actions.test.ts` y el panel) |
| `npm run lint`, `npm run typecheck`, `npm run build` | sin errores; `/cuenta` se genera |
| `npm run db:migrar` | aplicada en la base de desarrollo compartida; `prisma migrate status`: «Database schema is up to date» |

Las pruebas comprueban: solo cuentan los módulos del registro y únicamente si el rol puede abrirlos (inicio, cuenta, texto libre, valores que no son texto y módulos de otro rol no escriben); la ventana de 30 minutos en sus bordes y con marcas futuras o inválidas; que el servidor no suma dentro de la ventana aunque el navegador insista; el desempate del ranking (conteo, acceso más reciente, slug); que un módulo que el rol ya no puede abrir no aparece; que una falla de la base no rompe la navegación; y el panel con y sin historial.

El primer intento de `npm test` falló en `pauta-visual.test.ts`: el comentario «issue #226» de un `.tsx` se leyó como color hexadecimal. Se reescribió el comentario sin tocar la prueba.

## Límites

- **No se vio la pantalla en el navegador** (claro, oscuro, celular) ni con teclado: no se disponía de una sesión de prueba.
- **No se ejerció `registrarAcceso` contra la base real con una sesión**: se probó con dobles. Falta navegar por un módulo con una cuenta ficticia y comprobar que aparece la fila y que el panel la muestra.
- No hay prueba de `RegistroAcceso` (un efecto del navegador): su única lógica, `debeRegistrar`, sí está probada.
- La migración se aplicó a la base compartida antes de la revisión; es aditiva y no afecta a nadie más.
- `registrarAcceso` es una Server Action por cada módulo visitado cada 30 minutos; si Supabase renovara la sesión durante esa llamada, Next podría refrescar la ruta. No se observó, pero no se probó con sesión real.
- El conteo es acumulado: no distingue «mucho antes» de «ahora» (D-237).
