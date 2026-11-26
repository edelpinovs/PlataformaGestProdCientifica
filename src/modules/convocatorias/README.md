# convocatorias

Reglas de negocio, servicios y esquemas Zod de este módulo. Ver `src/modules/registry.ts` para su dueño y RF.

## Lectura de listados (RF-017)

- Los encabezados se reconocen por nombre en `lectura.ts`, sin acentos ni mayúsculas. Además del listado oficial del SNII (`CVU | APELLIDO PATERNO | APELLIDO MATERNO | NOMBRES | NIVEL OTORGADO`), se leen los formatos de la Coordinación (#355): `APELLIDOS` en una sola columna (se guarda en el apellido paterno), `CÓDIGO UdeG`, `Inicio vigencia` / `Fin vigencia`, `NIVEL SNII [<año>]` y `Resultado [en convocatoria] [<año>]`.
- Si un archivo trae el nivel que la persona ya tenía (`NIVEL SNII 2026`) y el resultado de la convocatoria (`Resultado 2026`), el nivel otorgado es el **resultado**. Un resultado vacío queda sin nivel y se avisa: no se toma el nivel anterior.
- Las vigencias del nombramiento UdeG (`INICIO VIGENCIA UdeG`) se ignoran.
- El resultado solo reemplaza al nivel anterior (`NIVEL SNII [<año>]`); un `NIVEL OTORGADO` explícito manda sobre un `RESULTADO` de otro tipo («Aprobado»).
- Un renglón sin CVU, código ni nivel se lee si trae vigencia (Perfil Deseable con solo nombre y fechas). Las filas de totales («TOTAL SNII», «Total de…») no son personas.
- El SNII publica sus resultados en la SECIHTI como PDF nacional: `RESULTADOS_COMISIONES_DICTAMINADORAS_<año>.pdf` (por ejemplo, [2026](https://secihti.mx/wp-content/uploads/snii/resultados/2026/RESULTADOS_COMISIONES_DICTAMINADORAS_2026.pdf)), con columnas `CVU | APELLIDO PATERNO | APELLIDO MATERNO | NOMBRES | NIVEL OTORGADO` y el encabezado repetido en cada página. Eméritos y reconsideración se publican aparte. No trae Código UdeG ni vigencia (D-224).
- Comprobado en local el 2026-11-23 con el listado 2026 (296 páginas): se leen los 11,523 renglones, todos con CVU y sin avisos. El archivo no se subió a la base ni al repositorio: trae datos reales.
- Un apellido de una letra puede llegar pegado al CVU en la misma celda («1234567 Y»); el lector los separa si la columna del apellido viene vacía.

## Cruce con el directorio (RF-018) y revisión de la carga (RF-019)

- Cada renglón del listado oficial se cruza con los profesores activos por CVU, luego por Código CUValles y al final por nombre (`cruce.ts`).
- El nombre se compara sin acentos, signos ni mayúsculas y **con las palabras ordenadas**. Por eso «Ana María López» y «María Ana López» chocan: si ambos están en el directorio, el renglón queda *dudoso* y no se asigna a nadie.
- Los renglones dudosos o sin coincidencia se resuelven a mano en `/convocatorias/revision/[id]`; quedan con criterio `MANUAL` (D-290) y se pueden quitar mientras la carga siga en revisión.
- El balance de la revisión usa las reglas del reporte de convocatoria anual (`balance.ts`, D-291). Un resultado *En reconsideración* de un participante no lo cambia el recálculo (`participantes.ts`).
- **Confirmar la carga** (`confirmacion.ts`, D-293): crea en M3 los reconocimientos de quienes coincidieron con las reglas de M3 y guarda el resultado de los participantes, en una sola transacción. Lo que una regla rechaza se omite y se muestra antes de confirmar. Vigencia SNII sin dato en el archivo: del 1 de enero del año siguiente al 31 de diciembre, 4 años Candidato y 5 los niveles (D-292). **Mientras D-292 no esté confirmada** (`VIGENCIA_SNII_CONFIRMADA = false`), ese SNII se omite y se muestra para registrarlo a mano.
