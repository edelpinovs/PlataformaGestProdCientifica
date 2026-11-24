# Prueba del #278 (parcial): vigencias vencidas y orden natural en Calidad de datos

| Campo | Valor |
|---|---|
| Issue | [#278](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/278) (el PR **no lo cierra**: quedan puntos pendientes, apartado 3) |
| Rama | `feat/M1-278-calidad-datos` → `main` |
| Fecha | 2026-11-24 |
| Lo preparó | I1 (`@edelpinovs`) con ayuda de un agente de IA |
| Entorno | Local (Windows 10, Node 24), PowerShell, sin base de datos |

## 1. Qué cambia

Solo el módulo `administracion`. Sin esquema, migración ni dependencias; de Reportes solo se **importan** funciones ya existentes.

| Punto del #278 | Cambio | Archivos |
|---|---|---|
| Vigencias vencidas | Nueva regla `VIGENCIA_VENCIDA`: arma las filas con las funciones del semáforo de Reportes (`filaSnii`, `filaProdep` y `cargarVigencias(["CA"])`) y reporta las que pinta de rojo. No hay segunda copia de la regla de vencimiento. De SNII y PRODEP solo cuenta el **último periodo de cada persona** (`ultimoPeriodoPorPersona`): un periodo anterior de quien ya renovó es historial, no algo que corregir. Enlaza a `/reportes?semaforo=ROJO&q=<nombre>` | `modules/administracion/calidad.ts`, `app/administracion/calidad/cargar.ts` |
| Orden natural de «Registro» | La comparación usa `localeCompare(..., { numeric: true })`: `UDG-CA-2` va antes que `UDG-CA-10`, en ambos sentidos | `modules/administracion/calidad.ts` |

## 2. Pruebas

Se ejecutaron desde PowerShell con la ruta `C:\PROJECTS\…` (con la letra de unidad en minúscula, vitest falla en esta máquina).

| Chequeo | Resultado |
|---|---|
| `npm test` | 118 archivos y 1,354 pruebas pasan, con `main` mezclado (nuevas: solo rojo entra, texto y enlace en español, sin vencidas no hay hallazgos, el filtro acepta la regla, orden natural ascendente y descendente; último periodo por persona y `cargar.test.ts`, apartado 4) |
| `npm run lint` | Sin errores |
| `npm run typecheck` | Sin errores |
| `npm run build` | Pasa |
| Pantalla en el navegador | **No revisada** (claro, oscuro y celular): pendiente con una cuenta de administrador y datos ficticios |

## 3. Lo que falta del #278

- **Homónimos sin resolver:** necesita que el dueño de Validación exponga su regla.
- **«Sin perfil de acceso» enlaza a un lugar donde corregir:** depende de #275 (invitar usuarios, D-242).
- **D-227 y D-229 siguen abiertas:** en Reportes, un periodo anterior de quien ya renovó sigue apareciendo en rojo (D-227). En Calidad ya no: solo cuenta el último periodo de cada persona (apartado 4). D-229 (cómo cuenta «en reconsideración») sigue la regla del semáforo.
- **Profesores no activos:** sus vigencias vencidas se siguen reportando (hallazgo 2 de la revisión del #303, menor), aunque las demás reglas los ignoran.
- **Excepción a D-009** (hallazgos filtrados, ordenados y paginados en memoria): sigue justificada en el código; se revisa si la lista crece.

## 4. Corrección tras la revisión del #303 (hallazgo 1)

La revisión (`docs/pruebas/PR-303-calidad-vigencias-y-orden.md`) encontró que cada periodo anterior de quien renovó quedaba para siempre como «Vigencia vencida». Se corrigió sin tocar el módulo de Reportes:

| Cambio | Archivo |
|---|---|
| `ultimoPeriodoPorPersona`: último periodo de cada profesor entre los que entran al semáforo (`cuentaParaSemaforo` de Reportes). Ordena por inicio, luego fin y luego id. Un periodo posterior no aprobado no sustituye al anterior: quien no renovó sigue con su distinción vencida. Se aplica por separado a SNII y a PRODEP | `modules/administracion/calidad.ts` |
| La carga lee SNII y PRODEP con `profesorId`, se queda con el último periodo de cada persona y arma las filas con `filaSnii` y `filaProdep` de Reportes. Los cuerpos siguen saliendo de `cargarVigencias(["CA"])` porque cada uno tiene un solo periodo | `app/administracion/calidad/cargar.ts` |

| Prueba nueva | Qué comprueba |
|---|---|
| `calidad.test.ts` | Varios periodos anteriores y uno vigente dejan solo el vigente; cada persona conserva el suyo; un posterior no aprobado no sustituye; uno en reconsideración sí; empates por inicio y por fin; sin periodos no queda nada; junto con la regla, quien renovó no aparece y quien no renovó sí |
| `app/administracion/calidad/cargar.test.ts` (Prisma simulado) | Quien renovó SNII y PRODEP no aparece; quien no renovó, o cuya renovación no se aprobó, aparece una sola vez; SNII y PRODEP se acotan por separado; a Reportes solo se le piden los cuerpos |

