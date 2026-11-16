# Prueba del PR #159: kit de marca SIGeC sin fuentes remotas (D-217, issue #151)

Registro de la revisión del [PR #159](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/159) de `irybyron` (rama `docs/issue-151-identidad-sigec`, commit `a979aa6`). El comentario está publicado en el PR. Se integró con las correcciones de I1.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `docs/diseno/marca/` (8 archivos) | Logos claro y negativo, iconos, favicon y PNG de 32, 180 y 512 px |
| `docs/diseno/identidad-sigec.md` | Nombre visible, uso de cada archivo y condiciones de la integración posterior |
| `docs/DECISIONES.md` | Pasaba D-217 a «vigente» (se quitó del PR) |

## 2. Chequeos

Solo documentación y activos. El CI pasó. Se leyó el código de los cinco SVG y se abrió el PNG de 512 px. `pauta-visual.test.ts` pasa (6 de 6) con los cambios de I1.

## 3. Hallazgos (publicados en el PR) y dictamen

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | A corregir | El PR registraba D-217 como «vigente» con «aprobación confirmada por @irybyron». El equipo aprobó SIGeC en el chat y en reunión (comunicado por I1), y el registro lo hizo el [PR #171](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/171). Se quitó `DECISIONES.md` del PR |
| 2 | A corregir | Conflicto con `main` en `DECISIONES.md` |
| 3 | A corregir | `Closes #151` cerraba la decisión al integrar solo el kit; pasó a `Refs #151` |
| 4 | Menor | La excepción de colores de marca solo estaba en un documento nuevo; I1 añadió una línea en la sección *Colores* de la pauta |
| 5 | Menor | Faltaba `<title>` en los SVG; I1 lo agregó en los cinco |
| 6 | Menor | Los logos usan Arial como texto y no trazado; el aspecto cambia según el sistema. Queda abierto |

**Bien:** quita el `@import` de Google Fonts de los dos logos completos, los PNG son idénticos a los de la rama anterior y la excepción de color se limita a los archivos de marca.

**Dictamen: solicitar cambios**, aplicados por I1 en la rama (commits `b5f7f4f` y `cef442f`). Integrado.

## 4. No se probó

Los SVG sobre el fondo claro y oscuro de la aplicación, y los PNG de 32 y 180 px (solo se compararon por contenido). La integración en `Marco`, `PantallaAcceso` y metadatos va en el #163.
