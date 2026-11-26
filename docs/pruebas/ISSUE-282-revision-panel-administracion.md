# Issue #282: revisión visual y pruebas con sesión real del panel de administración

Fecha: 2026-11-25. Origen: #241 a #244 (PR #263, #267, #268 y #269, integrados). Lo ejecutaron I1 (`@edelpinovs`) y un agente de IA que manejó el navegador, con cuentas ficticias en la base compartida. Es una lista de comprobación, sin código del panel; los hallazgos están abiertos como issues aparte (§4).

## 1. Entorno

| Dato | Valor |
|---|---|
| Código | `main` en `189215d`, servidor local en `http://localhost:3100` (webpack: Turbopack rechaza el enlace a `node_modules` de la copia aislada) |
| Base | la compartida de desarrollo, con datos de demostración y datos reales de profesores (D-259). Solo se tocaron cuentas ficticias |
| Cuentas de prueba | `admin.prueba282`, `coordinacion.prueba282` y `docente.prueba282`, todas `@demo.invalid`, creadas con `npm run invitar` |
| Navegador | Chrome con la extensión de Claude. Las contraseñas las definió y escribió I1; el agente nunca las escribió |
| Lo que NO es | Vercel, ni un teléfono real. La vista de celular y Vercel las comprobó I1 (ver §3) |

**Aviso sobre las capturas:** las pantallas de usuarios, calidad y escaneo mostraron correos y nombres reales. No se subieron al repositorio ni se citan aquí. Las cifras de este registro son conteos.

## 2. Resultados contra la lista del issue

| Punto de #282 | Resultado | Quién y cómo |
|---|---|---|
| Sin sesión, las 6 pantallas y las 2 descargas | Correcto: todas responden `307` a `/login` | Agente, con `curl` |
| Ver las 6 pantallas en tema oscuro | Correcto | Agente, en el navegador |
| Ver las pantallas en tema claro | **Parcial:** solo Estado del sistema y Usuarios. Inicio, Auditoría, Calidad y Escaneo no se vieron en claro | Agente |
| Botones «Descargar Excel» y «Descargar PDF» | Presentes en Usuarios, Auditoría y Calidad (Escaneo y Estado del sistema no los llevan, por diseño) | Agente |
| Editar rol y profesor | Correcto. Rol Docente → Coordinación y vinculado un profesor de demostración, en una sola edición | Agente |
| Desvincular al profesor | Correcto («Quitar selección» y Guardar) | Agente |
| Desactivar | Correcto (coordinación y docente). La fila pasa a «Desactivado» | Agente |
| Reactivar | Correcto (coordinación) | I1 |
| Desactivarme a mí mismo | Correcto: el servidor lo rechaza con «No puedes desactivar tu propio acceso. Pídeselo a otro administrador.» | Agente |
| Editar sin cambiar nada | Correcto: no escribe ni en el perfil ni en la bitácora (se verificó en 0 registros) | Agente |
| Un usuario desactivado no entra a ningún módulo | Correcto: «no entra». **No se anotó qué pantalla vio.** Por diseño vuelve a `/login` sin explicación (hallazgo H7) | I1 |
| Cada cambio queda en la bitácora | Correcto: **11 registros** al terminar (§2.1) | Agente |
| Descarga: Excel | Correcto. Con el filtro `q=prueba282` (1 fila): hoja «Usuarios», fila de encabezados congelada, 6 columnas. Se abrió con `exceljs`. I1 lo abrió en Excel: «ok» | Agente e I1 |
| Descarga: PDF | Correcto en contenido: 1 página con título, encabezados, la fila y «Página 1 de 1» (leído con `unpdf`). I1 lo abrió: «ok». El agente **no pudo ver su aspecto** (no hay renderizador de PDF) | Agente e I1 |
| Un correo que empieza con `=` no se ejecuta | Solo comprobado con `exceljs`: las cadenas que empiezan con `=`, `+` o `@` se guardan como texto, sin fórmula. **No se creó una cuenta real con un correo así ni se abrió en Excel** | Agente |
| Rol sin acceso: DOCENTE | Correcto: `/administracion`, usuarios, auditoría, calidad, escaneo, sistema y la descarga responden `307` al inicio con «Tu rol no tiene acceso a ese módulo.»; el menú solo muestra Inicio y Validación; no se descargó ningún archivo | Agente, con la sesión de I1 y el registro del servidor |
| Rol sin acceso: COORDINADOR | **No probado en vivo.** Pasa por el mismo camino de `requireRol` que Docente (solo ADMINISTRADOR en `registry.ts`) y `permisos.test.tsx` exige `requireModulo("administracion")` en cada página, pero nadie entró con coordinación | — |
| Vista de celular (390 × 844) | «ok», sin detalle | I1 (no se anotó cuáles pantallas ni qué se miró) |
| Descarga en Vercel (tamaño y tiempo con muchos registros) | «ok», **sin tamaños ni tiempos** | I1 |

### 2.1 Bitácora al terminar (11 registros)

| # | Acción | Quién | Qué dice |
|---|---|---|---|
| 1–2 | Exportó un listado | cuenta de prueba | Excel y PDF de usuarios (1 fila, con filtro de búsqueda) |
| 3 | Cambió rol o profesor | cuenta de prueba | Docente → Coordinación y vinculó al profesor `DEMO001` |
| 4 | Desactivó el acceso | cuenta de prueba | coordinación |
| 5 | Reactivó el acceso | cuenta de prueba | coordinación (la hizo I1) |
| 6 | Cambió rol o profesor | administración real | Coordinación → Docente (la hizo I1) |
| 7–8 | Exportó un listado | administración real | Excel y PDF de usuarios (17 filas) |
| 9 | Cambió rol o profesor | cuenta de prueba | Desvinculó al profesor |
| 10–11 | Desactivó el acceso | cuenta de prueba | docente y coordinación |

Cada registro tiene persona, módulo, acción y un detalle legible; el detalle de las exportaciones incluye los filtros usados. Esta es la primera comprobación de extremo a extremo de que las acciones guardan su registro en la base: los PR #267 y #269 solo la habían probado con dobles.

## 3. Lo que NO se comprobó

- **COORDINADOR en vivo** (arriba).
- **Celular, Vercel y los archivos abiertos en Excel y PDF:** los reportó I1 como correctos, pero sin detalle. No hay tamaños ni tiempos de Vercel, que era el motivo de esa comprobación. Anotar números en este registro cuando se tengan.
- **Tema claro** de Inicio, Auditoría, Calidad y Escaneo.
- **Aspecto del PDF:** solo su texto.
- **Un correo con `=` en un Excel real.**
- **Lector de pantalla, Safari y Firefox.**
- **La descarga con muchos registros:** el tope de 10,000 filas se probó con un conteo simulado.
- **Estado del sistema en Vercel:** en local muestra la clave de Scopus «Sin configurar» y la protección «No configurada» porque a la copia local le faltan esas variables. No es el estado real de producción y hay que mirarlo allí.

## 4. Hallazgos y dónde quedaron

| # | Hallazgo | Gravedad | Dónde |
|---|---|---|---|
| H1 | «Desactivar» usa el icono de basura en rojo (igual que eliminar) y «Reactivar» es un «+» | Menor | [#347](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/347) |
| H2 | Las etiquetas de «Problema» en Calidad se parten en dos líneas | Menor | #347 |
| H3 | «Sin perfil de acceso» son 172 de 182 hallazgos de Calidad | Decisión | [#348](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/348) |
| H4 | Descarga sin sesión redirige a `/login` conservando `?listado=…&formato=…` | Menor | #347 |
| H5 | «Se guardaron los cambios» aunque no hubo cambios | Menor | #347 |
| H6 | La confirmación de desactivar el propio usuario ofrece un botón que el servidor rechaza | Menor | #347 |
| H7 | Una persona desactivada vuelve a `/login` sin explicación | Decisión | [#349](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/349) |
| H8 | El aviso de validación del navegador sale en el idioma de Chrome (visto en el acceso) | A corregir | Acceso: PR [#345](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/345). Los demás formularios: [#350](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/350) |
| H9 | La línea «Seleccionado … Quitar selección» del selector queda lejos del campo y de «Guardar» | Menor | #347 |
| H10 | El correo de la columna «Persona» de la bitácora se partía a mitad de palabra | Menor | **Ya corregido** en `main` (ahora se parte en la arroba) |

## 5. Estado en que quedan las cuentas de prueba

- `coordinacion.prueba282` y `docente.prueba282`: **desactivadas**, sin profesor vinculado. El profesor de demostración `DEMO001` quedó libre.
- `admin.prueba282`: **sigue activa**. No puede desactivarse a sí misma (regla probada arriba); la tiene que desactivar otra cuenta de administración. Pendiente.

## 6. Pendiente para cerrar #282

- Desactivar `admin.prueba282` con otra cuenta de administración.
- Probar COORDINADOR en vivo (reactivar `coordinacion.prueba282`, entrar, probar las rutas y volver a desactivarla) o aceptar la cobertura indirecta.
- Anotar aquí los resultados de celular, Vercel y los archivos abiertos, con detalle.
- Ver en tema claro las cuatro pantallas que faltan.
- Revisión de otra persona.
