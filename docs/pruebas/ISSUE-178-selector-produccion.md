# Issue #178: selector de profesor en Producción

Fecha: 2026-11-09. Rama: `feat/M6-RF-020-selector-profesor`. Creada desde `origin/main` actualizado, incorpora #175 como dependencia para conservar sus cinco fuentes. El PR se compara contra esa rama y requiere revisar #175 primero.

## Resultado

Escanear permite mantener «Todos los profesores activos» o desmarcar esa opción para buscar uno por nombre, apellidos o código con `SelectorProfesor`. Quitar una selección individual obliga a elegir otra: no amplía silenciosamente la búsqueda a todos. Las opciones que entrega el servidor son profesores activos. Los trabajos pendientes muestran el profesor original y bloquean sus controles; si dejó de estar activo se informa sin sustituirlo.

Publicaciones usa el mismo selector, opcional y con el nombre de campo `profesor`. Conserva profesores no activos porque sus obras siguen siendo consultables. Quitar selección busca en todos; los filtros, orden y sentido se conservan en el formulario GET, que vuelve a la página 1 al buscar.

Se reutilizan los permisos existentes: `requireModulo` en las páginas y `requireRol(["COORDINADOR"])` en el inicio y continuación. El servidor valida con Zod y el inicio vuelve a consultar la elegibilidad dentro de la transacción. Se limita el identificador de profesor al Int de 32 bits; una selección manipulada recibe un mensaje en español.

## Alcance compartido aprobado

@irybyron autorizó expresamente la ampliación de `src/components/listado.tsx`: cada filtro puede aportar `contenido` opcional con su etiqueta y campo. Los consumidores existentes conservan su selector nativo; no se modifica `SelectorProfesor`, no se añaden dependencias ni se cambia el esquema en esta entrega.

## Comprobaciones

| Control | Resultado |
| --- | --- |
| `npm test` | 756 pruebas, 64 archivos: pasan |
| `npm run lint` | Pasa |
| `npm run typecheck` | Pasa |
| `npm run build` | Pasa |
| Chrome aislado, claro/oscuro/celular 390 × 844 | Pasan ambos formularios; capturas inspeccionadas |

Prueba reproducible: `node src/app/produccion/selector-profesor.navegador.mjs`. Comprueba búsqueda sin acentos y por código, flechas/Enter/Escape, falta de coincidencias, selección conservada tras respuesta de error y al escribir otra búsqueda, validación de selección individual obligatoria y bloqueo de un trabajo pendiente. En Publicaciones comprueba selección opcional, profesores no activos, conservación de texto/año/tipo/fuente/estado/orden/sentido, reinicio de página y enlace para limpiar.

Se repitieron `escaneo-manual.navegador.mjs` y `fuentes.navegador.mjs` en los tres tamaños/temas. Los selectores de las pruebas se ajustaron para distinguir fuentes y alcance, y comprobar la deshabilitación heredada de `fieldset` con `:disabled`.

Se añadió cobertura de rechazo de un profesor que dejó de estar activo entre abrir y enviar el formulario, y del límite de identificadores antes de consultar Prisma. No se usaron datos personales ni se ejecutaron consultas reales a proveedores. Las pruebas visuales montan los componentes de formulario con acciones simuladas; queda la comprobación del flujo completo con sesión en el despliegue de revisión.
