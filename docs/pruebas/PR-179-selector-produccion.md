# Revisión del PR #179: selector de profesor en Escanear y Publicaciones (RF-020, #178)

Registro de la revisión del [PR #179](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/179) de `irybyron` (rama `feat/M6-RF-020-selector-profesor`, base la rama del #175). Cierra #178. El comentario está publicado en el PR.

## 1. Alcance revisado

`SelectorProfesor` en el formulario de Escanear (con la opción «Todos los profesores activos») y en el filtro de Publicaciones (opcional, incluye no activos); `contenido` opcional por filtro en `BarraListado`; límite de 32 bits del identificador; D-220.

## 2. Chequeos

Solo se leyó el diff y el código de los componentes. El CI (`verificar`) y Vercel pasaron; no se ejecutaron `npm test`, `lint` ni `typecheck` en copia local, y la pantalla no se vio en el navegador.

## 3. Hallazgos

| # | Hallazgo | Tipo |
|---|---|---|
| 1 | Se adelanta al piloto de Profesores (D-216); `SelectorProfesor` no tiene consumidores en `main` | Bloqueante de proceso |
| 2 | Cambio en `src/components/listado.tsx` autorizado solo por la autora; D-220 queda «vigente» | Bloqueante de proceso |
| 3 | Depende del #175 (abierto, con cambios solicitados); cambiar la base a `main` después | Bloqueante de proceso |
| 4 | «(no activo)» se añade al apellido de la opción | A corregir |
| 5 | Sin prueba del límite de 32 bits en el filtro de Publicaciones | A corregir |
| 6 | `opciones: []` obligatorio con `contenido`; ayudante de Chrome duplicado; sin lector de pantalla ni sesión real | Menor |

**Bien:** permisos, revalidación de elegibilidad en la transacción, selección individual obligatoria, trabajo pendiente bloqueado, consumidores existentes sin cambio.

## 4. Dictamen

**Solicitar cambios** (de proceso).
