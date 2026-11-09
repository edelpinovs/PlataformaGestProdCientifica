# Issue #169: historial y continuidad de búsquedas

Fecha: 2026-11-09. Rama: `feat/M6-RF-020-historial-busquedas`.

Se incorporan `/produccion/historial` y `/produccion/continuidad`, con permisos del módulo antes de consultar datos. Ambos listados paginan diez filas con COUNT/LIMIT/OFFSET, búsqueda literal sobre todos los campos mostrados, orden permitido por columnas y filtros finitos en URL. El historial conserva las ejecuciones, sin Editar/Eliminar, según la excepción justificada en #169.

El detalle muestra el siguiente profesor pendiente y el resumen seguro. Los trabajos antiguos no inventan fuentes o fechas de finalización: dicen «No registradas» o «No registrada». Los nuevos trabajos guardan la finalización real al recorrer la última posición. La vista de continuidad cruza profesores activos con fuentes para incluir también los casos sin corte, conserva el corte válido ante fallos y explica el solapamiento. No deduce cobertura desde fechas de publicaciones.

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 623 pruebas, 54 archivos; pasan |
| `npm run lint` | Pasa |
| `npm run typecheck` | Pasa |
| `npm run build` | Pasa |
| Chrome, claro y oscuro, ambas páginas | Pasa con diez filas ficticias; capturas inspeccionadas |
| Chrome, celular 390 × 844, ambas páginas | Pasa, con filas apiladas, selector de orden y sin desbordamiento horizontal; capturas inspeccionadas |
| SQL contra Supabase | COUNT y página de ambas vistas pasan con un texto ficticio sin coincidencias; cero registros mostrados, sin escrituras |

Prueba reproducible: `node src/app/produccion/historial.navegador.mjs`. Usa perfil temporal de Chrome, datos ficticios y dependencias de servidor simuladas. Las pruebas del dominio cubren búsqueda escapada, orden/filtros manipulados, consultas sin corte, separación profesor/fuente, compatibilidad histórica y el año inicial/solapamiento.

Dependencias funcionales: #170 restringe la ejecución a Coordinación y retira el cron; #168 conserva las exclusiones; #167 ampliará las fuentes de continuidad y guardará la selección en cada trabajo. Esta entrega no ejecuta búsquedas desde el historial: el enlace de Coordinación vuelve a la pantalla de escaneo.

Limitaciones: falta una revisión independiente y comprobar con una sesión real los resultados con contenido. Las capturas usan un Marco simulado para aislar las páginas, no una sesión autenticada. No se modificó esquema ni se realizaron escrituras de prueba en la base compartida.
