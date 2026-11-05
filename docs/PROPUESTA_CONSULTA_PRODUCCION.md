# Primera entrega de consulta de publicaciones

Propuesta de I6 para un issue nuevo. No representa un acuerdo del equipo ni una funcionalidad implementada. El PR #63 sigue dedicado al motor RF-020 a RF-022; esta consulta debe tener su propio issue y rama.

## Problema

El listado de Producción muestra las últimas 50 publicaciones sin búsqueda, filtros ni navegación entre páginas. Los datos de demostración permiten probar la consulta sin incorporar información real a la base de desarrollo.

## Resultado propuesto

Administración y coordinación pueden buscar y recorrer las publicaciones desde `/produccion`, manteniendo los permisos actuales. La entrega inicial se limita a los archivos de Producción; no modifica Reportes, Validación, componentes compartidos, roles ni el esquema de Prisma.

## Terminado cuando

- [ ] Busca por texto en título, autores y DOI (RF-PC-01).
- [ ] Filtra por profesor, año, tipo, fuente y estado de autoría (parte de RF-PC-02 y RF-PC-04 a RF-PC-06).
- [ ] Combina los filtros con Y lógico y ofrece limpiar filtros (RF-PC-09).
- [ ] Si se seleccionan profesor y estado, ambos se comprueban en la misma autoría; no basta que otro coautor tenga ese estado.
- [ ] Pagina con 20, 50 o 100 filas y muestra el intervalo y total filtrado (parte de RF-PC-10).
- [ ] Conserva filtros y página en la URL; cambiar filtros vuelve a la primera página.
- [ ] Valida los parámetros en el servidor con Zod y mensajes en español; evita consultas sin límite.
- [ ] Protege la página con `requireModulo("produccion")` y mantiene administración/coordinación como roles de acceso.
- [ ] Mantiene separados el profesor elegido para consultar y el profesor elegido para escanear.
- [ ] El conteo de resultados es de publicaciones únicas, sin multiplicarlas por sus autorías. No introduce indicadores institucionales nuevos.
- [ ] Incluye pruebas de las reglas de filtrado, validación y paginación con datos ficticios.
- [ ] Cumple `npm test`, `npm run lint` y `npm run typecheck`; declara el resultado de build y de la revisión visual.
- [ ] Se entrega por PR revisado con `Closes #<issue>` y sin tocar `main` directamente.

## Fuera de esta entrega

El detalle y perfil de producción, filtros por adscripción o reconocimientos, ordenación interactiva, rango de fechas, indicadores, exportaciones, consultas guardadas y roles nuevos van en entregas posteriores. Las dependencias con Validación y Reportes requieren el acuerdo D-211; el alcance de Crossref y cuartiles sigue pendiente en D-210.

## Archivos previstos

Las reglas y esquemas vivirían en `src/modules/produccion/consulta.ts`, con `consulta.test.ts`. La consulta Prisma y el formulario GET quedarían en `src/app/produccion/`, reutilizando `Marco` y las piezas de UI existentes.
