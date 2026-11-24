# Revisión del PR #301: inicio del panel de Administración y columna de alta (#276)

Registro de la revisión del [PR #301](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/301) de `edelpinovs` (rama `feat/M1-276-inicio-panel`). Cierra #276. El comentario está publicado en el PR. La autoría es de I1: esta revisión es de apoyo y **no sustituye la aprobación de otra persona del equipo**.

## 1. Alcance revisado

Cinco tarjetas con `count` (profesores activos, cuerpos académicos, vigencias por vencer, pendientes de validación, usuarios); lista «Requiere atención» (`inicio.ts`, función pura); actividad reciente desde la bitácora; columna «Alta» en Usuarios, con orden, búsqueda por fecha (`2026`, `2026-11`, `2026-11-24`, hora de Ciudad de México) y exportación (`fechas.ts`, `usuarios-listado.ts`, `exportar.ts`). Sin esquema, migración ni dependencias.

## 2. Chequeos

- `npm run typecheck` y `npm run lint`: pasan en copia local.
- `npm test` (verificado en local el 2026-11-24, sobre `6083756`, último commit de la rama): **117 archivos y 1,326 pruebas pasan**, y `npm run typecheck` sin errores. La primera revisión no pudo ejecutarlo por un problema de entorno (la ruta de trabajo con la letra de unidad en minúscula rompía vitest; se corrige ejecutando desde PowerShell con `C:\PROJECTS\…`). Además pasa el CI (`verificar`, en verde).
- Vercel en verde; sin conflictos con `main`.
- La pantalla no se vio en el navegador y la autoría tampoco (lo declara pendiente: inicio del panel, columna «Alta», su orden, la búsqueda por fecha y la exportación, en claro, oscuro y celular). Las cifras se probaron con Prisma simulado, no con la base real.
- La rama está abierta en otra copia de trabajo, así que se revisó en un checkout separado del PR.

## 3. Hallazgos

| # | Hallazgo | Tipo |
|---|---|---|
| 1 | «Vigencias por vencer» suma reconocimientos SNII, PRODEP y cuerpos académicos, no personas: una persona con SNII y PRODEP por vencer cuenta dos veces. Aclararlo en la nota de la tarjeta o en el registro | Menor |
| 2 | La cifra depende de D-227 y D-229, aún pendientes: cambiará con el semáforo (es lo buscado, pero conviene dejarlo en una nota de D-227/D-229 o en el seguimiento) | Menor |
| 3 | `inicio.ts` importa de `@/modules/reportes/*` (`semaforo`, `vigencias`): acoplamiento de lectura con otro módulo, sin tocarlo. Anotar que un cambio de firma allí rompe este panel | Menor |
| 4 | «Actividad reciente» muestra el correo de quien actúa y el resumen de la bitácora: aceptable por ser solo de Administración, pero confirmar que ningún resumen guarda datos sensibles | Menor |
| 5 | Revisión visual y de la exportación con sesión real en la vista previa, pendiente (lo declara la autoría) | Pendiente |

**Verificado:** los enlaces de las tarjetas y de «Requiere atención» existen y usan parámetros válidos (`/profesores?situacion=activos`, `/reportes?semaforo=AMARILLO`, `/administracion/calidad?regla=SIN_PERFIL` y `CA_SIN_LIDER`); `rangoPorVencer` usa el mismo cálculo (`setMonth` con `MESES_AVISO`) que `calcularSemaforo`; cada cifra es un `count`, sin cargar tablas; `requireModulo("administracion")` en la página; mensajes en español; reglas puras con su prueba.

## 4. Dictamen

**Aprobable con comentarios.** Ningún hallazgo bloquea; falta la aprobación de otra persona y la revisión visual con sesión.
