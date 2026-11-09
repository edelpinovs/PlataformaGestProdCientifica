# Issue #167: cinco fuentes seleccionables

Fecha: 2026-11-09. Rama: `feat/M6-RF-020-fuentes-seleccionables`. Se prepara sobre la rama de #169 para extender también el historial y la continuidad.

Se añaden selección validada en servidor, conservación por trabajo, las consultas independientes de Crossref y Google Scholar/SerpAPI, estados por profesor/fuente y trazabilidad de procedencia. Las fuentes desmarcadas no se consultan, incluido el enriquecimiento de Crossref. La ejecución sigue restringida a Coordinación; #170 contiene la retirada del cron y la serialización del inicio, y #168 añade las exclusiones explícitas de autorías rechazadas.

## Comprobaciones

| Control | Resultado |
| --- | --- |
| `npm test` | 702 pruebas, 58 archivos; pasan antes de combinar las ramas dependientes |
| `npm run lint` | Pasa |
| `npm run typecheck` | Pasa |
| `npm run build` | Pasa |
| Chrome aislado, claro/oscuro/celular 390 × 844 | Pasa; capturas inspeccionadas |

Las 31 combinaciones no vacías se prueban tanto al validar la selección como al ejecutar el motor, con comprobación de llamadas a los cinco conectores y del enriquecimiento. Se prueban selección vacía o manipulada, reanudación que ignora cambios enviados por el navegador, cortes de fuentes exitosas/fallidas, procedencia y deduplicación.

Los conectores se prueban con HTTP simulado: cursores, perfil de Scholar, metadatos, falta de clave/perfil, ausencia de resultados, asociación de autores, ORCID incompatible, cuota 429 y paginación fallida. Las páginas incompletas no adelantan cortes. No se consulta SerpAPI con credenciales reales ni se usa una suscripción pagada.

Prueba visual reproducible: `node src/app/produccion/fuentes.navegador.mjs`. Detectó un reinicio nativo de los checkboxes tras una respuesta de validación de React; se corrigió remontando el formulario con sus valores controlados en cada respuesta. La prueba confirma selección vacía, una fuente y «Seleccionar todas».

## Esquema y migración

El alcance fue autorizado por @irybyron: añadir `CROSSREF` a `FuentePublicacion` y actualizar la etiqueta de Validación. Se ejecutó `npm run db:nueva-migracion -- agrega_fuente_crossref` y se regeneró el cliente con `prisma generate`; no se editaron archivos generados a mano.

El SQL generado incluía un DROP de `RenglonResultado`, ajeno a Producción, porque esa tabla existe en la base compartida y no en el esquema local. Se retiraron el DROP de tabla y de su clave foránea; la migración revisada contiene exclusivamente `ALTER TYPE "FuentePublicacion" ADD VALUE 'CROSSREF'`. No se ejecutó `db:migrar` ni se alteró la base compartida. El PR debe revisarse antes de aplicar la migración.

Pendientes de operación: revisión independiente, aplicación de la migración aprobada, creación/configuración segura de la cuenta gratuita de SerpAPI y comprobación con datos de demostración en el despliegue. Las capturas usan acciones simuladas; no prueban la cuota ni el rendimiento de los proveedores reales.
