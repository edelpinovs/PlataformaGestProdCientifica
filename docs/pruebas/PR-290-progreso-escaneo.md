# Revisión del PR #290: progreso y fuente del escaneo (RF-020, #251)

Registro de la revisión del [PR #290](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/290) de `irybyron` (rama `feat/M6-RF-020-progreso-escaneo-251`). Cierra #251.

## 1. Alcance revisado

Barra de avance con la fuente en curso y región de estado (`formulario-escaneo.tsx`); la fuente se guarda en `Job.datos` (`fuenteEnCurso`, sin migración) mediante `informarFuente` en `ejecutarEscaneo` y `procesarSiguienteProfesor`; pruebas de acción, cola y orquestador; script de navegador.

## 2. Chequeos

- `npm run typecheck` y `npm run lint`: pasan en copia local.
- `npm test`: **no se pudo ejecutar en la copia local de quien revisó**; falla en los 113 archivos, también en `main`, por un problema del entorno local con vitest. Las 1,271 pruebas constan solo por el CI (`verificar`, en verde) y lo declarado en el PR.
- Vercel en verde; sin conflictos con `main`.
- La pantalla no se vio en el navegador ni con lector de pantalla.

## 3. Hallazgos

| # | Hallazgo | Tipo |
|---|---|---|
| 1 | `informarFuente` va dentro del `try` de cada fuente y `informarFuente(null)` fuera: si la escritura del indicador falla, esa fuente se registra como error o el `catch` de `trabajos.ts` marca el trabajo `FALLIDO` antes de guardar las publicaciones. El indicador debe ser de mejor esfuerzo, con su prueba | A corregir |
| 2 | Una escritura más en `Job` por fuente y profesor; anotarlo para escaneos de todos los profesores | Menor |
| 3 | El texto de `role="status"` cambia en cada avance: revisar con lector de pantalla real | Menor |
| 4 | Flujo con sesión y proveedores reales sin confirmar (lo declara la autora) | Menor |
| 5 | La sangría completa del formulario agranda el diff | Menor |

**Bien:** cumple el *Terminado cuando* del #251, sin migración ni cambios fuera del módulo, `fuenteEnCurso` validada con Zod y mensaje en español, el indicador no renueva la reserva ni adelanta el avance (con prueba).

## 4. Dictamen

**Aprobable con comentarios**; conviene corregir el hallazgo 1 antes de integrar.
