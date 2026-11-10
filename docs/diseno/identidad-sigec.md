# D-217: identidad sigec

Decisión D-217, aprobada por el equipo en el chat y en reunión y comunicada por I1 el 2026-11-09; origen: [#151](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/151). La respuesta escrita en el issue queda pendiente.

Nombre visible: **SIGeC — Sistema Integral de Gestión Científica**. Se conservan repositorio, tablas e identificadores internos.

## Kit de marca

Los SVG y PNG de marca en [marca/](marca/) conservan sus colores originales; esta excepción se limita a esos activos y no permite colores literales en TSX ni modifica los colores semánticos de interfaz. La excepción también consta en la sección *Colores* de `PAUTA_VISUAL.md`. Los logos usan Arial/sans-serif local, sin importaciones de fuentes ni solicitudes externas; su tipografía puede variar según las fuentes instaladas.

- sigec-logo.svg: superficies claras; sigec-logo-negativo.svg: oscuras.
- sigec-icono.svg y sigec-icono-blanco.svg: espacios compactos.
- favicon.svg y PNG de 32, 180 y 512 píxeles: iconos del sitio.

## Integración (#163)

Integrada en `Marco`, `PantallaAcceso` y los metadatos. Se usa el icono del kit con el nombre y la descripción como texto (el logotipo completo no cabe en el menú lateral con un subtítulo legible): `src/components/marca.tsx`. El icono es decorativo y el nombre accesible del enlace es el texto; la variante se elige por tema con CSS. El favicon y los iconos de la aplicación usan el kit y se retiró el favicon por omisión de Next.js. Los logotipos completos (`sigec-logo.svg` y `sigec-logo-negativo.svg`) siguen sin usarse en la interfaz; quedan como material de diseño.
