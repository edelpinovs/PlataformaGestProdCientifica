# D-214: modales de alta

Acuerdo confirmado por @irybyron en sesión del 2026-11-09; origen: [#148](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/148). No se atribuyen comentarios de aprobación a otros responsables.

El listado es la pantalla principal: título en Marco, descripción, total y Registrar; panel con búsqueda, filtros, tabla y paginación D-009. Editar y Eliminar permanecen en FilaEditable. Escaneo, cargas, revisión y reportes conservan sus flujos.

## Contrato de implementación

- Modal con título accesible, foco inicial dentro, Tab y Mayús+Tab contenidos y retorno del foco al botón de apertura.
- Cancelar y Escape cierran solo sin envío; si hay cambios, piden confirmación accesible dentro del diálogo. El fondo no cierra.
- Server Action con useActionState, permisos y Zod en servidor. Durante el envío: «Guardando…», sin envíos repetidos ni cierre.
- Los errores conservan valores, mantienen abierto el modal y muestran Aviso en español y aria-invalid.
- Solo un guardado confirmado cierra, actualiza el listado y anuncia el éxito. Mantener búsqueda, filtros, orden y página; aclarar que el registro puede quedar fuera de la vista actual.
- Cada apertura empieza limpia. En celular, contenido desplazable y controles alcanzables.
- Sin dependencias nuevas. Probar teclado, cambios sin guardar, envío, error y éxito; revisar claro, oscuro y celular.

La pieza común requiere su propio issue y PR después de integrar la documentación. Profesores será el piloto coordinado con su responsable (D-216). Cada módulo se adapta en otro PR. Este documento no afirma que las pantallas existentes ya usen modales.
