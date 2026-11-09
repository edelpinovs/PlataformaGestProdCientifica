# Issue #162: selector compartido de profesores

Fecha: 2026-11-09. Rama: `feat/M2-RF-UI-selector-profesor`.

D-214/D-215, pauta y AGENTS están en main mediante #153, #154 y #155. Se incorpora la pieza compartida sin migrar pantallas ni alterar elegibilidad, roles o esquema. La integración en los modales y en cada módulo se entrega después del piloto.

| Control | Resultado |
| --- | --- |
| `npm test` | 631 pruebas, 54 archivos; pasan |
| `npm run lint` | Pasa sin advertencias |
| `npm run typecheck` | Pasa |
| `npm run build` | Pasa |
| Chrome, claro y oscuro, 1280 × 900 | Pasa; capturas inspeccionadas |
| Chrome, celular 390 × 844 | Pasa; captura inspeccionada, sin desbordamiento horizontal |

Prueba: `node src/components/selector-profesor.navegador.mjs`, con perfil temporal, profesores ficticios y formulario local. Comprueba nombre/apellidos/código, acentos, selección por flechas/Home/End/Enter y ratón, Escape, campo oculto que conserva el identificador al buscar, estado sin coincidencias, quitar selección, obligatoriedad y selección que deja de estar entre las opciones permitidas. `CHROME_BIN` permite indicar otra instalación de Chrome.

Las pruebas del módulo comprueban la búsqueda dentro del conjunto permitido, campos atípicos con mensajes españoles, ausencia de consulta con identificadores manipulados, nueva consulta de elegibilidad en cada guardado, rechazo tras cambiar la elegibilidad y traducción de incidencias de datos. Los callbacks están simulados: no se lee ni escribe Supabase.

Excepción a D-009 y #59: las sugerencias son una lista efímera de opciones, limitada a diez y refinada con el buscador; no son registros de gestión para paginar, editar o eliminar. El conteo de coincidencias explica cuándo precisar la búsqueda.

Limitaciones: la página consumidora sigue siendo responsable de filtrar opciones por permisos, exigir permisos en cada Server Action y consultar con Prisma la elegibilidad vigente dentro del callback. El piloto deberá comprobar esa integración con sus reglas reales. Falta revisión independiente y una comprobación con lector de pantalla.
