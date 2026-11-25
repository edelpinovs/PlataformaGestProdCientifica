# Prueba del #276: inicio del panel de administración y columna de alta

| Campo | Valor |
|---|---|
| Issue | [#276](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/276) (el PR lo cierra) |
| Rama | `feat/M1-276-inicio-panel` → `main` |
| Fecha | 2026-11-24 |
| Lo preparó | I1 (`@edelpinovs`) con ayuda de un agente de IA |
| Entorno | Local (Windows 10, Node 24), PowerShell, con `main` mezclado en `01af549`. Sin base de datos; `next dev` se levantó pero el navegador no pudo abrir la pantalla (apartado 5) |

## 1. Qué cambia

Solo el módulo `administracion`. Sin cambios de esquema, migración ni dependencias, y sin tocar `src/components/` ni `src/lib/`. De Reportes solo se **importan** funciones existentes (no se editan).

| Punto del #276 | Cambio | Archivos |
|---|---|---|
| Tarjetas con cifras | Cinco tarjetas, cada una con su enlace: profesores activos (`/profesores?situacion=activos`), cuerpos académicos, vigencias por vencer (`/reportes?semaforo=AMARILLO`), pendientes de validación (`/validacion`) y usuarios con acceso. Todas salen de `count` | `app/administracion/page.tsx` |
| Vigencias por vencer | Es el amarillo del semáforo de Reportes: SNII y PRODEP aprobados o en reconsideración, y cuerpos académicos, que vencen en los próximos `MESES_AVISO` (12) meses. Reutiliza `MESES_AVISO`, `cuentaParaSemaforo`, `finDeCuerpo` e `inicioDelDiaUtc` en lugar de copiarlos | `modules/administracion/inicio.ts` |
| «Requiere atención» | Función pura `requiereAtencion`: profesores activos sin perfil, cuerpos sin líder, vigencias por vencer y publicaciones por validar. Solo muestra lo que tiene casos, con singular y plural en español y enlace a donde se corrige | `modules/administracion/inicio.ts`, `app/administracion/page.tsx` |
| Actividad reciente | Los cinco últimos registros de la bitácora (`Auditoria`), con la acción en español, la hora de México y el resumen; enlace «Ver bitácora» | `app/administracion/page.tsx` |
| Columna «Alta» en Usuarios | Sale de `Perfil.creadoEn`. Se ordena (con desempate por `id`) y se busca por fecha como en PRODEP (`2026`, `2026-11` o `2026-11-24`), con los límites del día en hora de Ciudad de México. También sale en la exportación a Excel y PDF | `modules/administracion/fechas.ts`, `usuarios-listado.ts`, `exportar.ts`, `app/administracion/usuarios/`, `app/administracion/exportar/route.ts` |

Decisiones tomadas con I1 antes de programar (las pedía el issue):

- **Vigencias por vencer con D-227 y D-229 abiertas:** se usa la regla actual del semáforo. Si esas decisiones cambian el semáforo, la tarjeta cambia con él, porque no hay una segunda copia de la regla.
- **Búsqueda por fecha de alta:** formato de PRODEP, en hora de México, con la función en el módulo `administracion` (no se movió a `src/lib/`).
- **Tarjeta de métrica:** se dejó en la página con las clases que ya usaba; no se agregó una pieza a `src/components/ui`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 117 archivos, 1326 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |

## 3. Pruebas nuevas o cambiadas

| Archivo | Qué comprueba |
|---|---|
| `modules/administracion/inicio.test.ts` | El rango de «por vencer» coincide con el amarillo de `calcularSemaforo` en sus cuatro bordes (hoy, un instante antes, el límite y un instante después); solo cuentan aprobado y en reconsideración; los años de cuerpo académico que entran, también al cambiar de año; «Requiere atención» vacío sin casos, orden fijo, singular y plural, separador de miles y enlaces |
| `modules/administracion/fechas.test.ts` | El día empieza a las 06:00 UTC y respeta el horario de verano de fechas anteriores a 2023; búsqueda de día, mes y año, también en diciembre; un alta a las 23:30 del 24 en México cae en el 24; textos que no son fecha y fechas que no existen (30 de febrero, 31 de noviembre, mes 13) no son periodo; 29 de febrero solo en año bisiesto |
| `modules/administracion/usuarios-listado.test.ts` | La búsqueda agrega la condición de alta para un día y un mes en hora de México y no la agrega para texto ni para una fecha inválida; orden por alta con desempate por `id` |
| `modules/administracion/exportar.test.ts` y `app/administracion/exportar/route.test.ts` | La exportación lleva la columna «Alta» con la fecha en hora de México |
| `app/administracion/page.test.tsx` | Solo `count` (ningún `findMany` salvo los cinco registros de la bitácora); SNII y PRODEP con los resultados y el rango del semáforo y cuerpos con su año de vencimiento; las cinco tarjetas con cifras y enlaces; «Requiere atención» suma SNII, PRODEP y CA; estados vacíos; la actividad muestra la acción en español y no la clave interna, con la hora de México |
| `app/administracion/permisos.test.tsx` | Sin cambios: sigue comprobando que la página exige el permiso antes de consultar nada |

## 4. Revisión en el navegador

| Punto | Resultado |
|---|---|
| Inicio del panel en tema claro, tema oscuro y celular | **Pendiente** |
| Usuarios: columna «Alta», orden y búsqueda por fecha | **Pendiente** |
| Exportación de usuarios con la columna «Alta» (abrir el Excel y el PDF) | **Pendiente** |

## 5. Lo que no se probó

- **La pantalla en el navegador.** Se levantó `next dev` en el puerto 3001 desde una carpeta aparte (la principal estaba en otra rama), pero Chrome mostró una página de error y el pedido no llegó al servidor, aunque desde la terminal sí respondía. Queda para la vista previa de Vercel o para quien revise el PR, con sesión de administrador.
- **Las consultas contra la base real:** los `count` y el filtro por fecha de alta se probaron con Prisma simulado.
- **Cifras grandes en la tarjeta:** con muchas vigencias o pendientes, revisar que la cifra no desborde la tarjeta en celular.
