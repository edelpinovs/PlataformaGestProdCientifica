# convocatorias

Reglas de negocio, servicios y esquemas Zod de este módulo. Ver `src/modules/registry.ts` para su dueño y RF.

## Lectura de listados (RF-017)

- Los encabezados se reconocen por nombre en `lectura.ts`, sin acentos ni mayúsculas. Además del listado oficial del SNII (`CVU | APELLIDO PATERNO | APELLIDO MATERNO | NOMBRES | NIVEL OTORGADO`), se leen los formatos de la Coordinación (#355): `APELLIDOS` en una sola columna (se guarda en el apellido paterno), `CÓDIGO UdeG`, `Inicio vigencia` / `Fin vigencia`, `NIVEL SNII [<año>]` y `Resultado [en convocatoria] [<año>]`.
- Si un archivo trae el nivel que la persona ya tenía (`NIVEL SNII 2026`) y el resultado de la convocatoria (`Resultado 2026`), el nivel otorgado es el **resultado**. Un resultado vacío queda sin nivel y se avisa: no se toma el nivel anterior.
- Las vigencias del nombramiento UdeG (`INICIO VIGENCIA UdeG`) se ignoran.
