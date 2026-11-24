# Prueba del #279, parte 1: escaneos «sin avance», tiempo límite del estado del sistema y lectura tolerante de Scopus

| Campo | Valor |
|---|---|
| Issue | [#279](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/279) (parte 1; el PR usa `Refs`, no cierra el issue) |
| Rama | `feat/M1-279-escaneo-sin-avance-y-limite` → `main` |
| Fecha | 2026-11-24 |
| Lo preparó | I1 (`@edelpinovs`) con ayuda de un agente de IA |
| Entorno | Local (Windows 10, Node 24), PowerShell. Sin base de datos y sin `next dev` |

## 1. Qué cambia

Solo el módulo `administracion`. Sin cambios de esquema, migración ni dependencias, y sin tocar `src/app/produccion/`.

| Punto del #279 | Cambio | Archivos |
|---|---|---|
| «Sin avance» (hallazgo 2 de la revisión del #285) | Un escaneo en proceso que no se actualiza desde hace más de 10 minutos se muestra con la etiqueta «Sin avance» y la tarjeta «En curso» dice cuántos hay | `modules/administracion/escaneo.ts`, `app/administracion/escaneo/page.tsx` |
| Comprobación con límite de tiempo | `esperarConLimite` espera como máximo 3 s cualquier lectura; `comprobarServicio` la usa para el ping y la página del sistema la usa también para la lectura de la clave de Scopus (que consulta la misma base). La base se muestra como «No respondió en 3 segundos» y, si no se pudo leer la clave, como «No se pudo comprobar» (antes se daba por «sin configurar») | `modules/administracion/sistema.ts`, `app/administracion/sistema/page.tsx` |
| Que `/administracion/escaneo` no falle si falla la clave de Scopus | `estadoConfiguracionScopus().catch(() => null)` y el texto «no se pudo comprobar ahora» | `app/administracion/escaneo/page.tsx` |

`TIEMPO_SIN_AVANCE_MS` (10 min) repite el valor de `TIEMPO_RESERVA_MS` de Producción. Se dejó una copia a propósito para no editar `src/app/produccion/trabajos.ts` sin acordarlo con su dueño; el comentario lo dice y la parte 2 debe unificarlos.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 113 archivos, 1287 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |

## 3. Pruebas nuevas o cambiadas

| Archivo | Qué comprueba |
|---|---|
| `modules/administracion/escaneo.test.ts` | El límite es de 10 minutos; más de 10 está sin avance y justo 10 o menos no; pendiente, completado y fallido nunca están «sin avance»; el resumen lleva `sinAvance` |
| `app/administracion/sistema/page.test.tsx` | Con todo sano muestra «Responde»; con la base colgada dice «No respondió en 3 segundos»; con la base **y** la lectura de Scopus colgadas la página igual responde al pasar el límite; si falla la lectura de Scopus dice «No se pudo comprobar», no «Sin configurar», y no muestra el error; exige el permiso antes de consultar. Las pruebas de la base y de Scopus colgadas **fallan con el código anterior** y pasan con el arreglo |
| `modules/administracion/sistema.test.ts` | `esperarConLimite`: devuelve el valor a tiempo sin dejar un temporizador, `ok: false` y `agotado` al pasar el límite, un fallo rápido sin propagar el mensaje y una tarea que lanza de forma síncrona. Además, un fallo rápido no cuenta como tiempo agotado; si el servicio no contesta, responde «no responde» al llegar a 3 s y no antes; no queda un temporizador pendiente; acepta otro límite; un ping que lanza de forma síncrona no filtra su mensaje |

## 4. Lo que no se probó

- **Las pantallas en el navegador** (tema claro, oscuro y celular): la etiqueta «Sin avance», la nota de la tarjeta, el texto de Scopus y el detalle de la base.
- **La consulta real** de trabajos sin avance contra la base (`count` con `estado` y `actualizadoEn`): solo se probó la lógica pura. No hay prueba de la página cuando falla Scopus.
- **Una base que de verdad no responde:** el límite se probó con temporizadores simulados.

## 5. Lo que queda del #279 (partes siguientes)

Pide acuerdo previo con los dueños de M6 y con la coordinación:

- **Reintentar, cancelar y lanzar** un escaneo desde el panel: qué acciones puede lanzar un administrador frente a una coordinación (#265), y el estado nuevo `CANCELADO` en `EstadoJob` (migración, turno en la cola del #246).
- **Reunir la configuración de fuentes** de `produccion/configuracion` sin duplicar lógica.
- **Estado del sistema ampliado** a Storage y a las fuentes externas, de solo lectura y con el mismo límite de tiempo.
- **Unificar** `TIEMPO_SIN_AVANCE_MS` con `TIEMPO_RESERVA_MS`.

## 6. Corrección tras la revisión independiente

La [revisión del PR #288](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/291) encontró que el límite de 3 s no bastaba cuando la base se cuelga: la lectura de la clave de Scopus consulta la misma base y la página la esperaba sin límite. Se corrigió en este mismo PR (hallazgo 2). El hallazgo 1 («sin avance» no marca los `PENDIENTE` abandonados) y la unificación con `TIEMPO_RESERVA_MS` quedan para la parte 2 del #279, con I6.
