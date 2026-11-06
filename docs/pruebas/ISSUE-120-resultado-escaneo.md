# Issue #120: resultado del escaneo

Cuando una fuente falla y otra guarda obras, la pantalla muestra resultados parciales, las cantidades encontradas, guardadas o actualizadas y las autorías nuevas. Las incidencias usan mensajes permitidos por fuente; nunca imprimen errores técnicos. El último resultado permanece disponible al volver a Escaneo, con acceso a Publicaciones.

Se mantiene el estado persistido FALLIDO si hubo incidencias para conservar los reintentos y la compatibilidad. No se modifica el esquema, datos ni configuración de proveedores. La clave de Scopus debe configurarse aparte en el entorno de despliegue.

Pruebas: resultado parcial, fallo total, cero coincidencias, éxito, trabajos antiguos, errores sensibles y respuesta de la Server Action. Datos ficticios, sin escrituras en la base.

Validación: 543 pruebas correctas, lint, typecheck y build. Revisión visual claro, oscuro y celular pendiente por indisponibilidad de la herramienta de navegador. Sin aprobación independiente.
