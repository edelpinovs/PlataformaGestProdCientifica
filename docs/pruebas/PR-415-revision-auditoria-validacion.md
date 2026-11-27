# Revisión del PR #415: Validación registra dictámenes y borrados en la bitácora (#381)

Revisión del [PR #415](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/415) de `yanetzijimeno8297` (I7, responsable de Validación). Cierra [#381](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/381), un sub-issue de la bitácora de auditoría (#277).

| Campo | Valor |
|---|---|
| PR | #415 (`Closes #381`) |
| Autor | @yanetzijimeno8297 (I7) |
| Rama | `feat/M7-381-auditoria-validacion` → `main` |
| Commit revisado | `d699f06`. Va 5 commits detrás de `main` y **tiene conflicto** en `docs/SEGUIMIENTO.md` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | @edelpinovs (I1), con Claude Code |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`), con `main` mezclado y el conflicto de `SEGUIMIENTO.md` resuelto solo para probar. Sin base de datos y sin `next dev` |
| Resultado | **Solicitar cambios (menores).** Las tres acciones guardan su registro en la misma transacción y sin datos personales, como pide el #381. Pero cada una deja una rama que cambia sin registrar nada (hallazgo 1), inventa un correo de respaldo (hallazgo 2) y el conflicto impide que corra el CI (hallazgo 3) |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/validacion/actions.ts` | `confirmarAutoria` y `rechazarHomonimo` registran `validacion.dictaminada`. `eliminarPublicacionManual` registra `registro.eliminado` con el módulo `validacion`. Cada cambio va en `prisma.$transaction([cambio, registrarAuditoria(...)])` |
| `src/app/validacion/actions.test.ts` | 8 pruebas: el evento esperado en cada acción, sin nombres ni código del profesor, nada escrito cuando se rechaza por permiso o porque no existe, y la acción lanza el error si falla la transacción |
| `docs/pruebas/PR-415-auditoria-validacion.md` y `docs/SEGUIMIENTO.md` | La autora escribió su propio registro de revisión y su propia fila, con el dictamen «Aprobable» |

Sin cambios de esquema, migración ni dependencias. Usa `registrarAuditoria`, `eventoAuditoria`, `resumenDictamen` y `resumenEliminacion` tal como ya están en `main`, sin tocarlos.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (PR mezclado con `main`) | Correcto: 142 archivos, 1763 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| CI de GitHub (`verificar`) | **No corrió.** El PR tiene conflicto con `main`. Solo están las comprobaciones de Vercel |

## 3. Lo que se revisó y está bien

- **El cambio y su registro van juntos.** Las tres acciones usan la forma de arreglo de `$transaction`, igual que Usuarios. Si la bitácora falla, Prisma revierte el cambio.
- **Sin datos personales (D-294).** Los resúmenes llevan solo el id de la publicación y el resultado. Las pruebas comprueban que no aparecen el nombre, el apellido ni el código del profesor.
- **No se registra lo que se rechaza.** Sin permiso, con datos inválidos o con una publicación que no existe, la acción sale antes de la transacción. Las pruebas lo comprueban.
- **`P2025` se sigue capturando** al eliminar, porque `$transaction` deja pasar el error de Prisma.
- **Respeta los límites del módulo.** No agrega acciones a `ACCIONES_AUDITORIA` ni toca `src/lib/`: las dos acciones ya existían.

## 4. Hallazgos

### Hallazgo 1 (medio): una rama cambia los datos sin dejar registro

Cada una de las tres acciones lleva esto:

```ts
if (typeof prisma.$transaction === "function" && prisma.auditoria) {
  await prisma.$transaction([...]);
} else {
  await actualizacion; // sin bitácora
}
```

En producción siempre se cumple la condición, así que la rama `else` solo existe por las pruebas. El registro de la autora lo dice: «en entornos de prueba con dobles parciales». Pero el código de la aplicación no debe acomodarse a los dobles. Si alguna vez la condición fallara, el cambio se guardaría sin registro y sin avisar, que es justo lo que el #381 pide evitar («si el registro falla, no se guarda el cambio»).

Lo comprobé: con la condición cambiada por `true`, pasan las 39 pruebas de los tres archivos que importan estas acciones (`validacion/actions.test.ts`, `produccion/integracion.test.ts` y `avisos-navegador.test.tsx`). La rama no la necesita nadie.

**Qué hacer:** quitar el `if` y el `else` y dejar solo la transacción, como en `administracion/usuarios/actions.ts`.

### Hallazgo 2 (medio): un correo y un id inventados como respaldo

```ts
const actor = { id: perfil.id ?? "", correo: perfil.correo ?? "sistema@udg.mx" };
```

`requireModulo` devuelve el `Perfil` de la base, donde `id` y `correo` son obligatorios, así que los `??` nunca se usan. Aun así:

- **Si se usaran, la bitácora mentiría.** Atribuiría el cambio a una persona vacía o a «sistema@udg.mx».
- **Es un dominio real.** `udg.mx` es el de la universidad, y el repositorio es público. Las pruebas y los respaldos usan dominios ficticios.

**Qué hacer:** pasar `perfil` directamente, como en Usuarios, que hace `eventoAuditoria("usuario.editado", actor, …)` con el perfil que devuelve `requireModulo`. El `actor` repetido tres veces desaparece.

### Hallazgo 3 (medio): el conflicto impide que corra el CI, y el registro lo escribió la autora

- **El CI no corrió.** `docs/SEGUIMIENTO.md` tiene conflicto con `main`, así que GitHub no ejecutó `verificar`, y las pruebas de este PR no constan en el CI.
- **La autora escribió su propia revisión.** `docs/pruebas/` y `docs/SEGUIMIENTO.md` guardan la revisión de **otra** persona, que es quien da el dictamen (D-006). El PR trae un registro y una fila que la autora escribió sobre su propio trabajo, con el dictamen «Aprobable». Este registro lo reemplaza.

**Qué hacer:**

- Quitar del PR `docs/SEGUIMIENTO.md` y `docs/pruebas/PR-415-auditoria-validacion.md`. Si se quiere conservar su plan de pruebas, puede ir en la descripción del PR.
- Actualizar con `main`, comprobar que el CI pasa.

### Detalles menores

- **El registro no dice de qué profesor es el dictamen.** Se dictamina una autoría (publicación y profesor), pero `entidadId` y el resumen llevan solo la publicación. Si dos coautores confirman la misma publicación, sus registros solo se distinguen por quién actuó. El id del profesor es un número, no un dato personal, así que cabe en D-294. Se puede agregar al resumen («…: confirmada para el profesor 7.»), con `entidad: "Autoria"` y `entidadId: "12:7"`. Lo dejo a criterio de I7 y del #277.
- **La descripción del PR está desfigurada.** Se escribió en PowerShell con comillas dobles, y los acentos graves se convirtieron en caracteres de control: «\`v» salió como tabulador vertical, «\`r» como retorno y «\`n» como salto de línea. Por eso faltan letras («alidacion.dictaminada», «echazarHomonimo»). Además cita `docs/pruebas/PR-381-…`, y el archivo se llama `PR-415-…`. Conviene reescribirla con comillas simples (`@'…'@`) o con `gh pr edit --body-file`.
- **La reversión se prueba solo con dobles.** Es igual que en Catálogos (#402) y Convocatorias. Las pruebas comprueban que la acción lanza el error, no que la autoría vuelve a su estado. Conviene ensayarlo una vez con los datos de demostración.
- **Si falla la bitácora, la persona ve la página de error de Next,** porque el error sube. Es igual que en los demás módulos con bitácora. Se puede dejar así, o devolver un mensaje en español en `eliminarPublicacionManual`, que ya devuelve estados.

## 5. Lo que no se probó

- **La base real.** No dictaminé ni borré nada en la base compartida.
- **El navegador.** El PR no cambia pantallas.
- **Límite de esta revisión:** el revisor (I1) es otra persona que la autora. Esta revisión la hizo un agente, así que la aprobación en GitHub queda a cargo de I1 (D-006).
