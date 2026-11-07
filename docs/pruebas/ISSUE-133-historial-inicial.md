# Issue #133: historial inicial de ORCID y OpenAlex

Sin corte previo y sin año explícito, el motor consulta los conectores sin filtro anual. No itera año por año: utiliza el historial y la paginación del proveedor. Con corte previo conserva la ventana incremental y con año explícito respeta ese año sin mover el corte. Scopus conserva su comportamiento actual.

Se corrigió OpenAlex para que un fallo en una página posterior descarte el lote incompleto y no permita avanzar el corte como si se hubiera consultado todo el historial. El próximo intento vuelve a consultar el periodo completo. Los errores de guardado también conservan el corte como antes.

Pruebas ficticias: obras antiguas y sin fecha; paginación y fallo intermedio; primer escaneo de ambas fuentes; transición a incremental; fallo inicial y reintento; persistencia previa al corte; conservación del año explícito y comportamiento de Scopus.

Validación: 567 pruebas, lint, typecheck y build correctos. Sin APIs reales ni escrituras de datos en la base. La cantidad corresponde a esta rama desde main; la configuración de Scopus del PR #132 sigue siendo una entrega independiente.

Limitaciones: los cortes que ya existan no se borran ni reinician. Para obras anteriores de esos profesores se puede solicitar cada año; una función de reescaneo histórico completo sería otra entrega. Los perfiles extensos siguen sujetos al límite temporal por profesor del despliegue; no hay paginación persistida entre ejecuciones. No se modificó el esquema.

Revisión visual del texto explicativo pendiente: herramienta de navegador no disponible por error 3 en este entorno. No constituye aprobación independiente.
