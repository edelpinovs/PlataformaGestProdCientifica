# Prueba de los PR #157 y #158: documentos redundantes de D-214 y D-215 (issues #148 y #149)

Registro de la revisión del [PR #157](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/157) (commit `02312f6`) y del [PR #158](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/158) (commit `fa72e54`), de `irybyron`. Los dos se crearon antes de integrarse #153, #154 y #155. Los comentarios están publicados en cada PR. **Ambos se cerraron sin integrar.**

## 1. Alcance revisado

| PR | Archivos | Qué hacían |
|---|---|---|
| #157 | `docs/DECISIONES.md`, `docs/diseno/modales-de-alta.md` | Pasar D-214 a «vigente» y documentar el contrato del modal. `Closes #148` |
| #158 | `docs/DECISIONES.md`, `docs/diseno/selector-profesor.md` | Pasar D-215 a «vigente» y documentar el contrato del selector. `Closes #149` |

## 2. Chequeos

Solo documentación. El CI pasó, pero los dos PR estaban en **conflicto** con `main`. No se corrieron pruebas propias: se revisó el diff y el CI.

## 3. Hallazgos (publicados en los PR) y dictamen

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | Obsoleto | Editaban la fila de «Pendientes de acordar», que ya no existía: D-214 a D-216 pasaron a «vigente» con el #153 |
| 2 | Duplicado | Repetían la sección «Altas en modal» y «Selector de profesor» de la pauta (#154) |
| 3 | Atribución | Decían «confirmado por @irybyron»; la confirmación del equipo la dio I1. Escribir `@usuario` en archivos del repositorio notifica a esa persona cada vez que se cita |
| 4 | Prematuro | `Closes #148` y `Closes #149` cerraban las decisiones sin la respuesta escrita del equipo |
| 5 | Aporte útil (#158) | Dos precisiones no recogidas del todo: cada módulo conserva su regla de elegibilidad y los mensajes en español para campo ausente, `NaN`, identificador inexistente y selección manipulada. Se resolvieron en #166 |

**Dictamen: no integrar; cerrar.** Los dos están cerrados.

## 4. No se probó

Nada más allá del diff y del CI.
