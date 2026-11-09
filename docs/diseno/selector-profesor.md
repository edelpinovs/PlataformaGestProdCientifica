# D-215: selector profesor

Acuerdo confirmado por @irybyron en sesión del 2026-11-09; origen: [#149](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/149). No se atribuyen comentarios de aprobación a otros responsables.

Depende del patrón de altas D-214.

## Contrato de implementación

- Buscar por nombres, apellidos o código dentro de las opciones autorizadas para la operación.
- Campo con etiqueta, opciones con nombre y código, navegación por teclado y selección anunciada. Sin coincidencias: «No se encontraron profesores».
- Escribir una búsqueda no borra una selección existente; quitar o sustituir requiere una acción explícita.
- No crea profesores ni cambia su estatus.
- El servidor valida con Zod el identificador y vuelve a consultar existencia y elegibilidad al guardar; no confiar en las opciones del cliente.
- Cada módulo conserva sus reglas de elegibilidad. No imponer una condición global de activo o tiempo completo.
- Mensajes en español para campo ausente, NaN, identificador inexistente y selección manipulada.

Abrir el issue de la pieza con pruebas de búsqueda, teclado, selección conservada y revalidación de elegibilidad en servidor. Integrar después en el piloto coordinado con @dpfuentes92. La aprobación del patrón no altera las reglas de negocio.
