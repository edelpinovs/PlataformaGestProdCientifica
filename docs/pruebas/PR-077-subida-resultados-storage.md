# Prueba del PR #77: RF-016, subida directa a Storage y eliminación de cargas

| Campo | Valor |
|---|---|
| PR | [#77](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/77) (corrige lo integrado en #62; no lleva `Closes` porque #21 ya está cerrado) |
| Autoría | @Grillo-de-Alambre |
| Rama | `feat/M5-RF-016-carga-resultados` → `main` |
| Commit probado | `36f5645` |
| Fecha de la prueba | 2026-11-04 |
| Probó | Edel Pino (con Claude Code) |
| Entorno | Local (Windows 10, Node 24.15.0), copia aislada de la rama (`git worktree`), al día con `main`. Sin base de datos, sin `next dev` y sin llamadas a Supabase Storage. |
| Resultado | **Aprobado con comentarios.** Hay un punto de seguridad por decidir antes de integrar (sección 5) y no se vio la pantalla en el navegador. |

## 1. Alcance del cambio

Lo integrado en #62 no funcionaba: no existía el bucket de Storage y el archivo viajaba dentro de la Server Action, que en Vercel acepta como máximo 4.5 MB. Este PR sube el archivo directo desde el navegador.

| Archivo | Cambio |
|---|---|
| `prisma/migrations/20261103000000_bucket_resultados_convocatorias/migration.sql` | Nuevo, escrito a mano: bucket privado `resultados-convocatorias` (PDF o .xlsx, 50 MB), función `puede_gestionar_convocatorias()` y políticas de leer, subir y eliminar en `storage.objects` |
| `src/modules/convocatorias/carga.ts` | Reglas puras nuevas: `rutaValida`, `registroCarga`, `nombreDeRuta`, `tipoMime`, `motivoNoEliminable`, `BUCKET` |
| `src/modules/convocatorias/carga.test.ts` | 8 pruebas nuevas |
| `src/app/convocatorias/carga/actions.ts` | Reescrito: `prepararCarga` (valida y firma la subida), `registrarCarga` (comprueba el archivo y registra convocatoria, carga y tarea en una transacción) y `eliminarCarga` |
| `src/app/convocatorias/carga/FormCarga.tsx` | El navegador sube el archivo con `uploadToSignedUrl` |
| `src/app/convocatorias/fila.tsx` | Nuevo: fila del historial con *Eliminar* y confirmación en la fila |
| `src/app/convocatorias/page.tsx` | Usa la fila nueva |

No cambia `schema.prisma`, `src/lib/` ni `src/components/`.

### Flujo de la carga

1. `prepararCarga` valida con Zod y devuelve una URL firmada de Storage.
2. El navegador sube el archivo directo a Storage.
3. `registrarCarga` comprueba que el archivo exista y respete el límite, y registra carga y tarea `carga-resultados` (para RF-017). Si el registro falla, borra el archivo.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 11 archivos, 163 pruebas (155 en `main`, 8 nuevas) |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| CI de GitHub (`verificar`) | Correcto |
| Vista previa de Vercel | Correcto |
| `npm run build` | No se corrió: el disco local tenía 0.34 GB libres |

Para correr las pruebas en la copia aislada hizo falta `prisma generate`: sin el cliente generado, `profesores.test.ts` no carga (es un efecto de la copia, no del PR).

## 3. Pruebas del módulo `convocatorias`: 24 de 24 pasan

Salida de `npx vitest run --reporter=verbose`. Las marcadas **nueva** las agrega este PR; las demás ya existían.

**`cargaResultados` (RF-016)**

| # | Prueba | Resultado |
|---|---|---|
| 1 | Acepta un PDF de SNII y convierte el año a número | ✓ |
| 2 | Acepta un Excel de PRODEP | ✓ |
| 3 | Acepta un PDF grande de cientos de páginas hasta 50 MB | ✓ |
| 4 | Rechaza un archivo de más de 50 MB | ✓ |
| 5 | Rechaza un archivo vacío | ✓ |
| 6 | Rechaza formatos que no son PDF ni Excel | ✓ |
| 7 | Rechaza un programa distinto de SNII o PRODEP | ✓ |
| 8 | Rechaza años fuera de rango o no enteros | ✓ |
| 9 | Permite el año siguiente, para convocatorias que se publican por adelantado | ✓ |
| 10 | Exige elegir un archivo | ✓ |

**`formatoDeArchivo` (RF-016)**

| # | Prueba | Resultado |
|---|---|---|
| 11 | Reconoce PDF y Excel por extensión y tipo | ✓ |
| 12 | Confía en la extensión si el navegador no informa el tipo | ✓ |
| 13 | Rechaza un archivo renombrado cuyo tipo no coincide | ✓ |

**`rutaArchivo` (RF-016)**

| # | Prueba | Resultado |
|---|---|---|
| 14 | Ordena por programa y año y no pisa cargas anteriores | ✓ |
| 15 | Quita acentos, espacios y símbolos del nombre | ✓ |
| 16 | Usa un nombre genérico si no queda nada | ✓ |

**`rutaValida` y `registroCarga` (RF-016)**

| # | Prueba | Resultado |
|---|---|---|
| 17 | Acepta la ruta que generó `rutaArchivo` para el mismo programa y año | ✓ **nueva** |
| 18 | Rechaza una ruta de otro programa, de otro año o fuera de su carpeta | ✓ **nueva** |
| 19 | Explica que hay que volver a cargar si la ruta no se reconoce | ✓ **nueva** |
| 20 | Muestra el nombre del archivo sin la marca de tiempo | ✓ **nueva** |
| 21 | Guarda el tipo según el formato validado | ✓ **nueva** |

**`motivoNoEliminable` (#59)**

| # | Prueba | Resultado |
|---|---|---|
| 22 | Permite eliminar una carga que no se ha confirmado ni se está leyendo | ✓ **nueva** |
| 23 | No elimina una carga confirmada: es el resultado oficial | ✓ **nueva** |
| 24 | No elimina una carga mientras se lee su contenido | ✓ **nueva** |

**Lo que la suite no cubre.** `prepararCarga`, `registrarCarga` y `eliminarCarga` no tienen prueba automática (dependen de Prisma y Storage). Tampoco la migración ni las políticas de Storage.

## 4. Revisión de código

| Punto | Resultado |
|---|---|
| Permisos (RNF-005): `requireModulo("convocatorias")` al inicio de las tres Server Actions | Correcto |
| Validación con Zod en el servidor (`cargaResultados`, `registroCarga`) | Correcto |
| La ruta que llega del navegador solo se acepta con la forma que genera `rutaArchivo` para ese programa y año | Correcto |
| Si el registro falla, el archivo se borra de Storage | Correcto |
| Eliminar (#59): la condición va dentro del `deleteMany` (`estado: { not: "CONFIRMADA" }`), no borra la carga confirmada ni la que se está leyendo, y explica el motivo | Correcto, sigue la regla de `AGENTS.md` |
| Sin *Editar* ni `<FilaEditable>`, con justificación en la descripción (el archivo es el documento oficial) | Aceptable |
| Migración: solo agrega bucket, función y políticas; la función usa `SECURITY DEFINER` con `search_path = ''`, y solo la ejecuta `authenticated` | Correcto |
| Migración escrita a mano, ya aplicada en la base compartida (con `db:migrar`) | Dentro del flujo permitido; conviene que otra persona lea el SQL |

## 5. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | **La política `resultados_convocatorias_eliminar` permite borrar archivos de cargas confirmadas.** El bloqueo existe solo en la Server Action. Cualquier administrador o coordinador con sesión puede llamar a Storage directamente y borrar el PDF oficial, aunque la carga siga en la base. Se podría restringir con una condición que revise que no exista una `CargaResultados` con `estado = 'CONFIRMADA'` para esa ruta. | Por decidir antes de integrar (riesgo de quien ya tiene acceso) |
| 2 | `archivoRuta` no es `@unique`; el `findFirst` previo deja una carrera casi imposible, porque la ruta lleva marca de tiempo. | Menor |
| 3 | Un archivo subido que nunca se registra queda huérfano en Storage. | Menor |
| 4 | El bucket valida el tipo MIME declarado, no el contenido real del archivo. | Menor |
| 5 | `space-y-6` en `FormCarga.tsx:79`, fuera de `gap-4` / `gap-5` de la pauta. | Menor |
| 6 | Sin pruebas de `prepararCarga`, `registrarCarga` ni `eliminarCarga`. | Menor |

## 6. Lo que no se probó

- Las pantallas `/convocatorias` y `/convocatorias/carga` en el navegador (tema claro, oscuro y celular). La descripción del PR dice que se revisaron; esta revisión no las vio.
- Una subida real a Storage ni las políticas de la migración contra la base de desarrollo.
- `npm run build`.

## 7. Dictamen

**Aprobado con comentarios.** Antes de integrar:

1. Decidir qué hacer con el hallazgo 1: restringir el `DELETE` de Storage en esta misma migración o dejarlo como issue de seguimiento.
2. Que otra persona lea el SQL de la migración, que ya está aplicada en la base compartida.

Los hallazgos 2 a 6 pueden ir en un PR de seguimiento.
