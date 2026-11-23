# convocatorias

Reglas de negocio, servicios y esquemas Zod de este módulo. Ver `src/modules/registry.ts` para su dueño y RF.

## Cruce con el directorio (RF-018) y revisión de la carga (RF-019)

- Cada renglón del listado oficial se cruza con los profesores activos por CVU, luego por Código CUValles y al final por nombre (`cruce.ts`).
- El nombre se compara sin acentos, signos ni mayúsculas y **con las palabras ordenadas**. Por eso «Ana María López» y «María Ana López» chocan: si ambos están en el directorio, el renglón queda *dudoso* y no se asigna a nadie.
- Los renglones dudosos o sin coincidencia se resuelven a mano en `/convocatorias/revision/[id]`; quedan con criterio `MANUAL` (D-241) y se pueden quitar mientras la carga siga en revisión.
- El balance de la revisión usa las reglas del reporte de convocatoria anual (`balance.ts`, D-242). Un resultado *En reconsideración* de un participante no lo cambia el recálculo (`participantes.ts`).
