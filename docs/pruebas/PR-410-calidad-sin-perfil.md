# Revisión del PR #410: Calidad de datos deja de listar «Sin perfil de acceso» por omisión (#348)

Revisión del [PR #410](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/410) de `edelpinovs` (I1). Cierra [#348](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/348).

| Campo | Valor |
|---|---|
| PR | #410 (`Closes #348`) |
| Autor | @edelpinovs (I1) |
| Rama | `feat/M8-348-calidad-sin-perfil` → `main` |
| Commit revisado | `9f27af4` (ya contiene `main`, con el #409 integrado) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | @edelpinovs (I1), con Claude Code |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`). Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** Aplica la opción 2 del issue y la prueba en las funciones puras. La tarjeta «Requiere atención» sigue coincidiendo con Calidad. El archivo descargado deja fuera esa regla sin decirlo (hallazgo 1). D-299 quedó antes de D-298 en la tabla y la decidió una sola persona (hallazgo 2). La aprobación tiene que darla otra persona (D-006) |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/administracion/calidad.ts` | `REGLAS_OCULTAS_POR_OMISION = ["SIN_PERFIL"]`. Sin filtro de regla, `filtrarHallazgos` excluye esa regla. `hallazgosOcultos` devuelve los que se dejaron fuera, o ninguno si hay filtro de regla |
| `src/modules/administracion/calidad.test.ts` | Pruebas: por omisión no aparece, sí aparece con su filtro, no aparece con otro filtro ni con búsqueda libre, y `hallazgosOcultos` en los tres casos |
| `src/app/administracion/calidad/page.tsx` | Nota «No se listan N profesores activos sin perfil de acceso: es lo normal hasta invitarlos.» con el enlace «Ver cuáles» (`?regla=SIN_PERFIL`). La etiqueta del encabezado elige el singular o el plural según lo que se muestra |
| `docs/DECISIONES.md` | D-299 |

Sin cambios de esquema, migración ni dependencias. Todo queda dentro del módulo de Administración.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 142 archivos, 1757 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |

## 3. Lo que se revisó y está bien

- **Cumple la opción 2 del issue.** La regla no desaparece: se cuenta en el inicio del panel y se ve con su filtro.
- **La tarjeta «Requiere atención» coincide** (*Terminado cuando* del issue). Cuenta `sinPerfil` y enlaza a `?regla=SIN_PERFIL`, que con este cambio lista exactamente esos hallazgos.
- **El filtro «Problema»** sigue ofreciendo «Sin perfil de acceso», así que la regla se encuentra desde la propia pantalla, no solo con el enlace.
- **La regla vive en `src/modules/`** como función pura, con su prueba, como pide AGENTS.md. La página solo la usa.
- **El singular y el plural del encabezado** ahora miran lo que se muestra. Antes miraban el total sin filtrar.

## 4. Hallazgos

### Hallazgo 1 (medio): el archivo descargado omite la regla sin decirlo

La exportación (`exportar/route.ts`) usa el mismo `filtrarHallazgos`, así que sin filtro también deja fuera «Sin perfil de acceso». Pero `descripcionFiltros` solo describe los filtros que pidió la persona: sin filtro, el archivo no dice nada. Quien recibe el CSV o el Excel cree que tiene todos los hallazgos, y le faltan 172 de 182. En pantalla la nota lo explica; en el archivo no hay nota.

**Qué hacer:** en `descripcionFiltros`, cuando el listado es `calidad` y no hay filtro de regla, agregar algo como «sin «Sin perfil de acceso» (se ve con su filtro)», con su prueba. El cambio queda en el mismo módulo. La otra salida es que la descarga sin filtro incluya la regla. El PR deja ese punto abierto, y conviene decidirlo antes de integrar.

### Hallazgo 2 (bajo): D-299 quedó antes de D-298 y la decidió una sola persona

- **Orden.** Al mezclar `main` (que ya trae D-298 del #409), D-299 quedó encima de D-298 en `docs/DECISIONES.md`. La tabla va en orden de número. Basta con mover la fila.
- **Acuerdo.** El issue dice «El equipo elige una opción». D-299 dice «decidido por @edelpinovs (I1)» y quedó `vigente`, igual que D-297 y D-298. Hay que confirmarlo en el chat y anotar quién la aprobó, o dejarla `pendiente`.
- La nota del PR sobre el conflicto con el #349 ya no aplica: el #409 se integró y la mezcla no dio conflicto.

### Detalles menores

- **Estado vacío contradictorio.** Si los únicos hallazgos son «Sin perfil de acceso», la pantalla dice a la vez «No se encontraron inconsistencias. Los datos revisados están en orden.» y «No se listan 172 profesores…». No es falso, porque no son inconsistencias, pero se lee raro. Hoy no pasa con los datos de la base compartida.
- **La nota ignora la búsqueda.** Con un texto en el buscador, la nota sigue diciendo «No se listan 172», aunque muchos de ellos no coincidirían con la búsqueda. Es aceptable: describe la regla, no el resultado. Si se quiere precisión, se cuentan los ocultos que coinciden con `q`.
- **Sin prueba de la página.** La nota y su enlace no tienen prueba propia. La lógica está en `hallazgosOcultos`, que sí la tiene.

## 5. Lo que no se probó

- **El navegador.** No vi Calidad en tema claro, oscuro ni celular, ni descargué el archivo. La revisión se hizo sobre el código y las pruebas.
- **Las cifras reales** (172 de 182). Vienen del PR y del issue, no las consulté en la base.
- **Límite de esta revisión:** el autor y el revisor son la misma persona (I1, con un agente). La aprobación en GitHub debe darla otra persona del equipo (D-006).
