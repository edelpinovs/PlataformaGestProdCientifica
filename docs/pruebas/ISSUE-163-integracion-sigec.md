# Issue #163: integración de SIGeC en la interfaz (D-217)

Fecha: 2026-11-10. Rama: `feat/transversal-D-217-integrar-sigec`. Lo preparó I1, que es quien tiene el issue (cambia piezas compartidas de `src/components/`).

## Qué cambia

| Archivo | Cambio |
|---|---|
| `src/components/marca.tsx` | Nuevo. `<MarcaSigec>`: icono decorativo con una variante por tema, nombre «SIGeC» y «Sistema Integral de Gestión Científica» como texto |
| `src/components/marco.tsx` | El logotipo del menú lateral (la «P» y «PGPC / CUValles») pasa a `<MarcaSigec>` |
| `src/components/pantalla-acceso.tsx` | Igual, en tamaño grande |
| `src/app/globals.css` | `.marca-claro` y `.marca-oscuro`: se muestra la variante del tema elegido (`data-tema`), no la del sistema operativo |
| `src/app/layout.tsx`, `profesores/nuevo/page.tsx` | Título y descripción con SIGeC |
| `public/marca/` | Los dos iconos que se sirven (variante oscura y blanca) |
| `src/app/icon.svg`, `icon1.png`, `apple-icon.png` | Favicon e iconos de la aplicación con el kit; se retira `favicon.ico` (el de Next.js) |
| `src/components/marca.test.tsx` | Nuevo. 5 pruebas |
| `docs/diseno/PAUTA_VISUAL.md`, `identidad-sigec.md` | La pauta documenta la marca y su uso; el documento de identidad pasa a «integrada» |

No cambia el nombre del repositorio, las tablas ni los identificadores internos (`PGPC` sigue en el agente de usuario de Crossref y en el AAD del cifrado de Scopus, que no se ven). No cambia esquema, permisos ni dependencias.

**Decisión de diseño:** el logotipo completo del kit (`sigec-logo.svg`) no cabe en el menú de 240 px con un subtítulo legible (su descripción quedaría en unos 7 px). Se usa el icono del kit y el nombre y la descripción como texto real, que además es el nombre accesible del enlace.

## Comprobaciones

| Control | Resultado |
|---|---|
| `npm test` | 766 pasan (66 archivos); 5 son nuevas |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | **no se corrió en la copia** (Turbopack rechaza el enlace a `node_modules` de la copia aislada); lo cubre el CI del PR |
| Chrome aislado, claro, oscuro y celular 390 × 844 | Correcto; capturas de oscuro y celular inspeccionadas |

Las pruebas comprueban: se muestran el nombre y la descripción completa y ya no «PGPC»; los iconos son decorativos (`alt=""`) y el texto del enlace es solo el nombre y su descripción; hay una variante por tema y ambas apuntan a archivos que existen; los SVG que se sirven no cargan fuentes ni recursos externos; `PantallaAcceso` usa la misma marca.

La prueba de navegador (un script temporal, no incluido) renderizó el menú lateral y la pantalla de acceso reales y comprobó, en cada tema: se ve un solo icono por bloque; el del tema oscuro es el de fondo blanco y el del claro, el de fondo oscuro; el icono carga; el nombre visible del enlace es «SIGeC Sistema Integral de Gestión Científica»; el subtítulo mide 12 px; no hay desplazamiento horizontal.

## Límites

- `npm run build` queda al CI.
- No se vio con una sesión real: el menú se renderizó en una copia con la misma estructura, no dentro de `Marco`, que depende de la sesión.
- No se probó con lector de pantalla, ni en Safari o Firefox, ni el favicon en cada navegador (el SVG y los PNG son los del kit).
- Los logotipos completos (`sigec-logo.svg` y `sigec-logo-negativo.svg`) no se usan en la interfaz.
- El título de las pestañas cambia a «SIGeC · CUValles»; si se prefiere otro formato, es un cambio de una línea.

## Pendiente para integrar

Revisión de otra persona (toca `src/components/`: avisar al equipo en el chat) y revisión visual con sesión en el despliegue de vista previa. Con esto se cierra el #151.
