# Issue #114: pantallas y listado de Producci?n

Rama: feat/M6-RF-PC-10-pantallas-produccion. Responsable: I6.

Resumen, escaneo y publicaciones tienen rutas independientes, navegaci?n y permisos previos a cualquier lectura. B?squeda y filtros se despliegan a demanda. Listado compartido con 10 elementos por p?gina visibles, enlaces numerados solo debajo del listado, orden por todos los encabezados y selector de orden en celular. Las URL anteriores conservan filtros al redirigir.

Se conserva la excepci?n de edici?n y eliminaci?n del issue #97: los resultados externos se gestionan mediante sus autor?as. No se modifican componentes compartidos, esquema, dependencias ni otros m?dulos.

## Evidencia

- Pruebas de dominio: validaci?n, b?squeda en campos visibles, escape de patrones, filtros en una misma autor?a, p?ginas vac?as/extremas, enlaces y orden estable.
- Persistencia: snapshot coherente, obras ?nicas y l?mite de 10, incluido orden alfab?tico por etiquetas.
- P?ginas: autorizaci?n previa a lecturas, responsabilidades separadas y redirecciones antiguas.
- Lectura DEMO: 30 obras, tres p?ginas de 10 sin duplicados; orden de tipo y fuente, profesores por cantidad y filtro profesor/estado comprobados. Sin escrituras.
- Revisi?n visual pendiente: el navegador no inici? por error del entorno (failed to write kernel assets, error 3). Revisar claro, oscuro y celular antes de aprobar. Este registro no constituye aprobaci?n independiente.

Comprobaciones: npm test (538 pruebas), npm run lint, npm run typecheck y npm run build: correctas.

PR: https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/119 (borrador, sin aprobación independiente).
