# Validación de producción científica (M7)

Módulo encargado de la bandeja de validación interactiva, control de homónimos, captura manual de publicaciones no detectadas y cálculo de métricas oficiales de producción científica acreditada.

- **Requisitos:** RF-023, RF-024 y RF-025.
- **Responsable:** I7 (@yanetzijimeno8297).
- **Roles con acceso:** ADMINISTRADOR, COORDINADOR y DOCENTE (con alcance acotado a su propio profesorId).

---

## Estructura y vistas del módulo

El módulo implementa la pauta transversal de listados (D-009) ofreciendo cuatro vistas paginadas de 10 en 10 con búsqueda de texto libre y orden por encabezados:

1. **Bandeja de validación (`vista=bandeja`):**
   - Muestra las obras detectadas por escaneo o captura administrativa pendientes de revisión.
   - Permite confirmar autoría (`VALIDADA`), editar metadatos o rechazar por homónimo (`RECHAZADA`).
   - Filtros por `estado`, `fuente` y `tipo`.
2. **Publicaciones manuales (`vista=manuales`):**
   - Obras capturadas directamente mediante el formulario manual (RF-023).
   - Ofrece edición y eliminación en línea fila a fila mediante `<FilaEditable>` (regla #59).
   - Filtro por `tipo`.
3. **Conteo oficial por profesor (`vista=profesores`):**
   - Agregado en SQL de autorías validadas por docente, con código y departamento.
   - Filtro por `departamento`.
4. **Conteo oficial por departamento (`vista=departamentos`):**
   - Agregado en SQL de autorías validadas por departamento y nomenclatura.

---

## Control único de cambio de vista (`enlaceCambioVista`)

La selección de vista se realiza a través de un único control de navegación (`<nav aria-label="Listados de validación">`) estilizado según la pauta visual (`bg-marca-suave text-marca font-semibold` para la vista activa y botón secundario para las inactivas).

La función pura `enlaceCambioVista`:
- Preserva el texto de búsqueda (`q`) entre todas las vistas.
- Conserva los filtros aplicables a la vista de destino (por ejemplo, `tipo` entre bandeja y manuales) descartando los incompatibles.
- Conserva el orden si la columna existe en el destino, o reinicia al orden por omisión si la columna no aplica.
- Reinicia la paginación a la primera página.
- Evita controles duplicados en la barra de búsqueda y mantiene la vista actual mediante un campo oculto al enviar formularios de filtro.

---

## Métricas y conteo oficial mediante SQL `COUNT`

Las tarjetas superiores de resumen oficial (`totalValidadas`, `totalPendientes`, `totalRechazadas`) se calculan directamente en base de datos mediante una agregación SQL (`prisma.autoria.groupBy` con `_count`), mapeada por la función pura `mapearConteosEstado`. Esto elimina la necesidad de transferir miles de autorías a la memoria de Node.js.

---

## Justificación de excepciones a la regla #59 (Editar y Eliminar)

Siguiendo la regla de `AGENTS.md` (#59):

1. **Conteo por profesor y Conteo por departamento:**
   - Son resúmenes métricos agregados calculados en tiempo de ejecución en base a las autorías con estado `VALIDADA`.
   - No corresponden a registros base individuales y por diseño no admiten edición ni eliminación directa. Se actualizan automáticamente cuando las autorías son confirmadas o descartadas.
2. **Bandeja de validación (obras importadas / homónimos):**
   - Las publicaciones provienen de conectores multifuente y pueden estar compartidas entre múltiples coautores.
   - Borrar el registro físico eliminaría la publicación para los demás autores y provocaría que los escaneos futuros la volvieran a ingresar.
   - En su lugar, el flujo de negocio aplica el descarte mediante **rechazo por homónimo** (`RECHAZADA`), preservando la exclusión permanente para el profesor sin afectar a terceros.
3. **Publicaciones manuales:**
   - Cumplen plenamente la regla #59 ofreciendo *Editar* y *Eliminar* con `<FilaEditable>`.

---

## Aprobación de cambio de comportamiento por I7

Como responsable del módulo (I7), se revisó y aprobó formalmente la distribución del conteo oficial por profesor y por departamento en vistas seleccionables e independientes (en lugar de presentarse permanentemente al pie de la bandeja):
- Reduce la sobrecarga visual de la pantalla principal.
- Permite paginación de 10 en 10 (D-009), búsqueda libre y ordenamiento específico por cada columna de los resúmenes.
- Las tres tarjetas métricas superiores mantienen la visibilidad permanente del conteo global oficial en todo momento.
