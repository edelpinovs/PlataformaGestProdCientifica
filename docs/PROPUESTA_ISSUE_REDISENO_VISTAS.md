# Unificar las vistas de listados y crear registros mediante modal

Estado: **propuesta pendiente de aprobación del equipo**. Este documento es el borrador del issue; todavía no está publicado en GitHub ni constituye un acuerdo aprobado.

Fecha: 9 de noviembre de 2026.

## Necesidad

Unificar la presentación y navegación de los módulos de PGPC tomando como referencia la imagen «Profesores – rediseño@1x.png» compartida en la sesión. Los listados serán la pantalla principal de gestión; el alta se abrirá en un modal y, al guardar correctamente, se cerrará con un mensaje de éxito y el listado actualizado.

La imagen orienta la distribución y jerarquía. Se conservarán los colores con nombre, los temas, las piezas compartidas y las reglas de accesibilidad de la plataforma. No se copiarán los datos personales de la imagen a código, documentación de pruebas ni semillas.

## Alcance propuesto

- Catálogos, Profesores, Reconocimientos, Cuerpos académicos, Convocatorias, Producción, Validación y Reportes: aplicar un lenguaje visual común, respetando las funciones de cada módulo.
- Listados de gestión: encabezado con título, descripción, total de registros y acción principal; panel con búsqueda, filtros, tabla y paginación.
- Altas de registros: formulario en modal con Cancelar y Guardar. Los procesos de escaneo, carga de archivos, revisión y generación de reportes conservarán su flujo específico; no se convertirán automáticamente en modales.
- Selectores de profesores: búsqueda por nombre, apellidos y código, conservando la selección y los permisos actuales.
- Inicio y acceso: mantener sus estructuras específicas y la coherencia visual; no tratarlos como listados.

## Comportamiento propuesto

### Listados

1. Usar `Marco`, sin duplicar título ni menú; presentar el total sin filtros y distinguir el número de resultados filtrados cuando corresponda.
2. Buscar en todos los campos visibles y filtrar los valores finitos que aplique a cada entidad.
3. Mantener 10 registros por página, orden por cada columna de datos y estado validado en la URL. Cambiar búsqueda, filtro u orden vuelve a la página 1.
4. Mostrar «Mostrando a–b de N», Anterior y Siguiente, y un estado vacío con orientación cuando no haya resultados.
5. Conservar Editar y Eliminar mediante `FilaEditable`, con confirmación en la fila y protección de registros relacionados. El alcance solicitado cambia el alta a modal, no la edición.
6. Usar iconos con nombre accesible que identifique la acción y el registro. En celular, apilar las filas y ofrecer «Ordenar por», sin desplazamiento horizontal.
7. Mostrar Exportar únicamente donde exista una función autorizada e implementada. Este rediseño no incorpora nuevas exportaciones.

### Crear en modal

1. «Registrar…» abre un modal titulado según la entidad y sitúa el foco dentro de él.
2. Tab y Mayús+Tab mantienen el foco en el modal. Escape y Cancelar cierran cuando no hay un envío en curso; si hay cambios sin guardar, se pide confirmación accesible. Pulsar el fondo no cierra el formulario.
3. Cancelar no escribe datos y devuelve el foco al botón que abrió el modal.
4. Guardar usa Server Action y `useActionState`, con permisos y Zod en servidor. Mientras se envía, indicar «Guardando…» e impedir envíos repetidos y cierre accidental.
5. Si hay errores, conservar los valores, mantener el modal abierto, marcar los campos y mostrar mensajes en español mediante `Aviso`.
6. Solo tras confirmar el guardado en el servidor, cerrar el modal, actualizar el listado y mostrar un aviso como «Profesor registrado correctamente», anunciado a tecnologías de asistencia.
7. Conservar búsqueda, filtros, orden y página del listado. Si el registro nuevo no coincide con los filtros o queda en otra página por el orden, el aviso aclara que se guardó aunque no aparezca en la vista actual.
8. Al abrir un nuevo alta, mostrar el formulario limpio. En celular, adaptar el modal al espacio disponible con contenido desplazable y controles alcanzables.

### Buscar profesor

- El selector permite escribir nombre, apellidos o código y muestra coincidencias dentro de las opciones permitidas para la operación.
- Permite seleccionar con teclado y muestra un estado «No se encontraron profesores» cuando corresponda.
- La búsqueda no borra una selección existente sin una acción explícita. El servidor vuelve a validar el profesor y su elegibilidad.
- No crear profesores ni modificar su estatus desde este selector.

## Coordinación y archivos afectados

Se solicita aprobación expresa para modificar piezas compartidas en `src/components/`, el marco y, solo si hace falta para conservar el estado del listado, utilidades en `src/lib/listados/`. Se reutilizarán las piezas existentes y se propondrá una pieza común de modal y un selector con búsqueda, sin dependencias nuevas.

Cada responsable adaptará los archivos de su módulo según `src/modules/registry.ts`. Este issue no autoriza cambios de esquema, migraciones ni escrituras de demostración en la base compartida.

Actualizar `docs/diseno/PAUTA_VISUAL.md` cuando se apruebe el patrón: su ejemplo actual muestra el alta dentro de un panel. La imagen no sustituye la pauta vigente antes del acuerdo. Registrar la aprobación en `docs/DECISIONES.md` con fecha y enlace al issue.

## Entrega propuesta

1. Aprobar el patrón y el alcance de los componentes compartidos.
2. Implementar las piezas compartidas y una pantalla piloto de Profesores, coordinada con su responsable.
3. Revisar el piloto en claro, oscuro y celular antes de extenderlo.
4. Abrir o vincular issues por módulo y migrar cada uno con su responsable. Evitar un único cambio masivo sin revisión.

## Terminado cuando

- [ ] El equipo aprueba el alcance, la pantalla piloto y los cambios compartidos; queda registrado el acuerdo.
- [ ] La pauta visual documenta listados y altas en modal, con las excepciones de procesos específicos.
- [ ] El listado piloto sigue la referencia y mantiene búsqueda, filtros, orden, 10 filas por página y permisos.
- [ ] Se puede abrir, completar y cancelar el alta usando solo teclado.
- [ ] Un alta correcta cierra el modal, actualiza el listado, conserva su estado y muestra el aviso correspondiente.
- [ ] Un envío inválido conserva datos y muestra errores en español sin cerrar el modal.
- [ ] Se impiden envíos repetidos mientras se guarda.
- [ ] La búsqueda de profesores funciona por nombre, apellidos y código; respeta la elegibilidad y selección.
- [ ] Editar y Eliminar continúan funcionando, incluida la confirmación y el bloqueo por relaciones.
- [ ] Se verifica claro, oscuro y celular, sin desplazamiento horizontal, con datos ficticios.
- [ ] Se comprueban permisos tanto en páginas como en Server Actions y no se exponen opciones de otros roles.
- [ ] Se agregan pruebas pertinentes de comportamiento y de cualquier regla de negocio modificada, sin desactivar la prueba de pauta visual.
- [ ] Pasan `npm test`, `npm run lint`, `npm run typecheck` y el build del CI; se adjuntan resultados y limitaciones al PR.
- [ ] Los módulos se incorporan mediante issues y PR vinculados, revisados por otro integrante.

## Aprobación solicitada

### Identidad visual propuesta: SIGeC

Se incorpora para revisión el kit aportado por la persona solicitante en [docs/diseno/marca/](diseno/marca/). La marca incluida es **SIGeC — Sistema Integral de Gestión Científica**. Su adopción sustituiría la identificación PGPC visible en la interfaz; no implica renombrar el repositorio, las tablas ni los identificadores internos.

![Logo SIGeC para fondo claro](diseno/marca/sigec-logo.svg)

- Logo normal para superficies claras y `sigec-logo-negativo.svg` para oscuras.
- Iconos `sigec-icono.svg` y `sigec-icono-blanco.svg` para espacios compactos.
- `favicon.svg` y PNG de 32, 180 y 512 píxeles para iconos del sitio según corresponda.
- Integración propuesta en `Marco`, `PantallaAcceso` y metadatos/iconos de la aplicación, una vez autorizado el cambio compartido.
- Los originales se conservan como material de diseño. Antes de servir los SVG, resolver el `@import` remoto de Google Fonts de los logos completos para que su representación no dependa de una descarga externa; comprobar legibilidad del subtítulo en el menú.
- Verificar logo e iconos en claro, oscuro y celular, conservando proporciones y un nombre accesible sin duplicar el texto del enlace.

- [ ] Aprobar SIGeC y su nombre completo como identidad visible del sistema.
- [ ] Aprobar el uso del kit en navegación, acceso e iconos del sitio y su adaptación técnica para servirlo sin fuentes remotas.

- [ ] Aprobar este patrón general y el uso de altas en modal.
- [ ] Aprobar los cambios necesarios en componentes compartidos y la actualización de la pauta.
- [ ] Confirmar Profesores como piloto y coordinarlo con `@dpfuentes92`.
- [ ] Aprobar la extensión por módulo con cada responsable del registro.

No implementar el cambio transversal hasta registrar estas decisiones. Los detalles de negocio de cada módulo se mantienen y cualquier cambio adicional requiere su propio acuerdo.
