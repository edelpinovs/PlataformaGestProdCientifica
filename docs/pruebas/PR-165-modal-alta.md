# Prueba del PR #165: pieza compartida ModalAlta (D-214, issues #156 y #161)

Registro de la revisión del [PR #165](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/165) de `irybyron` (rama `feat/M1-RF-UI-modal-alta`, commit `469bbcb`). Cierra #156 y #161. El comentario está publicado en el PR. Se integró con las correcciones de I1.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `src/components/modal-alta.tsx` | Alta en `<dialog>` nativo: foco, Tab atrapado, Escape y Cancelar protegidos, «Guardando…», errores que conservan los valores |
| `src/components/modal-alta-logica.ts` (+ prueba) | Funciones puras de cierre y de resultado |
| `src/components/modal-alta.navegador.mjs` | Prueba en Chrome aislado con acción ficticia |
| `docs/diseno/PAUTA_VISUAL.md` | Contrato de la pieza |

No cambia esquema, dependencias ni permisos. No migra pantallas.

## 2. Chequeos (copia aislada con `main` integrado)

| Chequeo | Resultado |
|---|---|
| `npm test` | 616 pasan (54 archivos) |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó |
| `node src/components/modal-alta.navegador.mjs` | correcto en claro, oscuro y celular (390 px); se miraron las capturas de oscuro y celular |

## 3. Hallazgos (publicados en el PR) y dictamen

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | A corregir | La nota de la pauta («la pieza aún no existe») y la viñeta de `AGENTS.md` quedaban falsas al integrar. I1 las actualizó: la pieza existe, ninguna pantalla la usa todavía |
| 2 | A corregir | Dos issues para la misma pieza (#156 y #161); el PR cerraba solo el #161. La descripción lleva ahora `Closes #156` y `Closes #161` |
| 3 | Menor | La prueba de navegador depende de Chrome instalado (ruta de Windows) y de `esbuild` y `postcss`, que no son dependencias directas |
| 4 | Menor | En tema oscuro el velo del modal es gris claro (`backdrop:bg-texto/40`) |
| 5 | Menor | En Chrome, dos Escape seguidos pueden cerrar el `<dialog>` sin disparar `cancel`; probar a mano |
| 6 | Menor | Rama y commit no siguen la convención; el `role` alterna entre `dialog` y `alertdialog` |

**Bien:** un resultado vacío o contradictorio nunca cierra el modal; cada apertura empieza limpia; el éxito conserva la URL del listado.

**Dictamen: aprobable con comentarios.** Los dos puntos a corregir los aplicó I1 en la rama (commits `fa5e825` y `3c04334`). Integrado.

## 4. No se probó

La pieza con una Server Action real (lo hará el piloto de Profesores), un lector de pantalla, `npm run build` en la copia y otros navegadores.
