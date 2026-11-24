# Revisión del PR #288: escaneos «sin avance», tiempo límite del estado del sistema y Scopus tolerante (#279, parte 1)

Revisión independiente del [PR #288](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/288) de `edelpinovs` (I1), que es la parte 1 del issue [#279](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/279) (usa `Refs`, no lo cierra). El PR trae su propio registro (`ISSUE-279-escaneo-sin-avance-y-limite.md`), que es la prueba de quien lo preparó; este documento es la revisión aparte.

| Campo | Valor |
|---|---|
| PR | #288 (`Refs #279`) |
| Autor | @edelpinovs (I1) |
| Rama | `feat/M1-279-escaneo-sin-avance-y-limite` → `main` |
| Commit revisado | `fb62668` |
| Fecha de la revisión | 2026-11-24 |
| Revisó | Edel Pino (con Claude Code) |
| Entorno | Local (Windows 10, Node 24), la rama del PR con `npm ci` y el cliente de Prisma generado. Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** No hay código roto, pero dos puntos de fondo no cumplen del todo lo que promete el issue. **El hallazgo 2 quedó corregido en `974e8e8`** (ver el apartado 8); el 1 sigue abierto |

**Límite de esta revisión:** el autor y quien la hace son la misma persona (I1), así que no cumple D-006: el PR sigue necesitando la aprobación de otra persona del equipo antes de integrarse.

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/administracion/escaneo.ts` | `TIEMPO_SIN_AVANCE_MS` (10 min), `sinAvanceDesde`, `estaSinAvance`; `resumirTrabajos` recibe y devuelve `sinAvance` |
| `src/app/administracion/escaneo/page.tsx` | Cuenta los trabajos sin avance, etiqueta «Sin avance» en los escaneos recientes, nota en la tarjeta «En curso» y `estadoConfiguracionScopus().catch(() => null)` |
| `src/modules/administracion/sistema.ts` | `comprobarServicio` con límite de 3 s (`LIMITE_COMPROBACION_MS`) y `agotado` en el resultado |
| `src/app/administracion/sistema/page.tsx` | Detalle «No respondió en 3 segundos» |
| Pruebas y `docs/pruebas/ISSUE-279-escaneo-sin-avance-y-limite.md` | Pruebas nuevas y el registro del autor |

No hay cambios de esquema, migración, dependencias ni de `src/app/produccion/`. Todo queda en el módulo `administracion`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (rama del PR) | Correcto: 112 archivos, 1278 pruebas, las mismas que declara el autor |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | No lo corrí; lo ejecuta el CI de GitHub (`verificar`) |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Mezcla con `main` | La rama está al día con `main`; GitHub la marca `MERGEABLE`. El estado `BLOCKED` es solo la aprobación pendiente |

## 3. Lo que se leyó y está bien

- **Tiempo límite:** `comprobarServicio` usa `Promise.race` con un temporizador que se limpia en `finally`; ni el rechazo tardío del servicio (R2) ni una respuesta justo antes del límite (R3) dejan problemas. Un fallo rápido no se confunde con tiempo agotado.
- **Sin secretos:** ni el mensaje de un fallo del servicio ni el de la lectura de Scopus llegan a la pantalla (R4).
- **Scopus tolerante:** si falla la lectura de la clave, `/administracion/escaneo` sigue y muestra «no se pudo comprobar ahora» (R4); con la clave bien leída, nada cambia (R5).
- **Indicadores:** la tarjeta «En curso» y la etiqueta «Sin avance» reflejan los conteos (R6). Los bordes de los 10 minutos están probados por el autor (justo 10, 11 y un día).
- **Permiso:** `requireModulo("administracion")` sigue siendo lo primero en las dos páginas, y `permisos.test.tsx` lo cubre.
- **Mensajes:** los textos nuevos están en español y no repiten errores de librerías.

## 4. Pruebas de revisión

Archivo temporal `src/app/administracion/revision-288.test.tsx`, que se borró después (el código está al final). Dos de ellas **demuestran un hallazgo**: pasan porque el comportamiento es el del hallazgo, no porque esté bien.

| # | Qué comprueba | Resultado |
|---|---|---|
| R1 | Un escaneo `PENDIENTE` abandonado hace un día **no** se marca «sin avance»; uno `EN_PROCESO` pasado el límite, sí | Pasa (demuestra el hallazgo 1) |
| R2 | Si el servicio falla después del límite, no queda un rechazo sin atender | Pasa |
| R3 | Un servicio que contesta un milisegundo antes del límite cuenta como que responde | Pasa |
| R4 | La página de escaneo no falla si falla la lectura de Scopus y no muestra el mensaje del error | Pasa |
| R5 | Con la clave bien leída, la página sigue mostrando su estado | Pasa |
| R6 | Las tarjetas y la etiqueta «Sin avance» reflejan los conteos | Pasa |
| R7 | La página del sistema dice «No respondió en 3 segundos» si la base no contesta (con la clave de Scopus resuelta) | Pasa |
| R8 | Con la base sana sigue mostrando «Responde» | Pasa |
| R9 | Si la base no contesta y la lectura de Scopus tampoco, la página sigue sin responder tras un minuto | Pasa (demuestra el hallazgo 2) |

## 5. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Importante | «Sin avance» solo mira `EN_PROCESO`, y es poco probable que se vea. El escaneo avanza **un profesor por petición** (`iniciarEscaneoAction` con `jobId`) y entre profesor y profesor el trabajo vuelve a `PENDIENTE`. Si la persona cierra la pestaña, queda `PENDIENTE` para siempre: no se marca (R1), «En curso» lo cuenta como cualquier otro y `crearTrabajoEscaneo` rechaza iniciar uno nuevo mientras exista. Además, la prueba del PR que dice que un `PENDIENTE` «nunca» está sin avance fija ese comportamiento | Marcar «sin avance» también a los `PENDIENTE` con `actualizadoEn` anterior al límite, y cambiar esa prueba. Acordarlo con I6, porque depende de cómo se reanuda un escaneo (parte 2 del #279) |
| 2 | Importante | El límite de 3 s no cumple el criterio del issue («responde «No responde» tras un tiempo límite») cuando la base de verdad no contesta. `estadoConfiguracionScopus()` consulta la misma base y se espera junto con el ping en el mismo `Promise.all`: si la base se cuelga, esa lectura también y la página no responde (R9). El límite solo funciona si falla el ping pero la tabla de claves sí contesta | Aplicar el mismo límite a la lectura de Scopus, y probar la página con las dos consultas colgadas. **Corregido en `974e8e8`** (apartado 8) |
| 3 | Menor | El `.catch(() => null)` de la lectura de Scopus no deja rastro en el servidor, igual que el hallazgo 1 del #285 | `console.error` con texto fijo, sin el mensaje de la base |
| 4 | Menor | `TIEMPO_SIN_AVANCE_MS` repite `TIEMPO_RESERVA_MS`. El PR lo dice; ya hay acuerdo (comentario del #279) de exportar la constante de Producción y usarla | Hacerlo en la parte 2, con el visto bueno de I6 |
| 5 | Observación | La etiqueta «Sin avance» solo aparece en los cinco escaneos recientes; el número de la tarjeta cuenta todos | Sin acción |

## 6. Lo que no se probó

- **Las pantallas en el navegador** (tema claro, oscuro y celular): la etiqueta «Sin avance», la nota de la tarjeta, el texto de Scopus y el detalle de la base.
- **La consulta real** de trabajos sin avance contra la base (`count` con `estado` y `actualizadoEn`): solo se probó con datos simulados.
- **Una base que de verdad no responde:** el límite se probó con temporizadores simulados (R7 y R9).
- **`npm run build`.**

## 7. Dictamen

**Aprobable con comentarios.** El PR puede integrarse como primera parte porque no rompe nada y mejora lo que mide. El hallazgo 2 ya se corrigió dentro del mismo PR (apartado 8); el 1 queda anotado en el #279 para la parte 2. Falta la aprobación de otra persona del equipo (D-006).

## 8. Actualización: hallazgo 2 corregido (`974e8e8`, 2026-11-24)

Después de esta revisión, el autor corrigió el hallazgo 2 en el mismo PR. Se volvió a comprobar así:

| Verificación | Resultado |
|---|---|
| Qué cambió | `esperarConLimite` aplica los 3 s a cualquier lectura; `comprobarServicio` la usa para el ping y la página del sistema la usa también para la lectura de la clave de Scopus. Si no se pudo leer la clave, muestra «No se pudo comprobar» (antes la daba por «Sin configurar») y no el mensaje del error |
| Pruebas nuevas del autor (`sistema/page.test.tsx` y `sistema.test.ts`) | Con el código anterior de la página **fallan dos** (la página se cuelga y se da la clave por «sin configurar»); con la corrección pasan |
| Mis pruebas de revisión sobre `974e8e8` | **8 de 9 pasan y R9 falla**, que es lo esperado: R9 afirmaba que la página seguía colgada tras un minuto, y ahora termina al pasar los 3 s. R1 sigue pasando, porque el hallazgo 1 no se tocó |
| `npm test` | Correcto: 113 archivos, 1287 pruebas (las mismas que declara el autor) |
| `npm run lint` y `npm run typecheck` | Correctos (corridos sobre el mismo código, justo antes del commit) |

Sin cambios en los demás puntos: el hallazgo 1 («sin avance» no marca los `PENDIENTE` abandonados) sigue abierto para la parte 2 del #279, con I6; los menores y la aprobación de otra persona (D-006) también.

<details>
<summary>Código de las pruebas de revisión (apartado 4)</summary>

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Pruebas de la revisión independiente del PR #288 (no forman parte del PR).
const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  estadoScopus: vi.fn(),
  prisma: {
    $queryRaw: vi.fn(),
    job: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
    corteEscaneo: { groupBy: vi.fn() },
    profesor: { count: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles.prisma }));
vi.mock("@/app/produccion/configuracion-scopus", () => ({ estadoConfiguracionScopus: dobles.estadoScopus }));
vi.mock("@/app/produccion/trabajos", () => ({ TIPOS_ESCANEO: ["escaneo-manual", "escaneo-diario"] }));

import { estaSinAvance, TIEMPO_SIN_AVANCE_MS } from "@/modules/administracion/escaneo";
import { comprobarServicio, LIMITE_COMPROBACION_MS } from "@/modules/administracion/sistema";
import EscaneoPage from "./escaneo/page";
import SistemaPage from "./sistema/page";

const PERFIL = { correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" };
const AHORA = new Date("2026-11-24T12:00:00Z");
const hace = (ms: number) => new Date(AHORA.getTime() - ms);
// Junta los textos de un árbol de elementos de React recorriendo solo `props` (el `type` puede ser circular).
function texto(nodo: unknown, salida: string[] = []): string {
  if (typeof nodo === "string" || typeof nodo === "number") salida.push(String(nodo));
  else if (Array.isArray(nodo)) nodo.forEach((hijo) => texto(hijo, salida));
  else if (nodo && typeof nodo === "object" && "props" in nodo) {
    const props = (nodo as { props: Record<string, unknown> }).props;
    for (const valor of Object.values(props)) {
      if (typeof valor === "object" || typeof valor === "string") texto(valor, salida);
    }
  }
  return salida.join(" ");
}

beforeEach(() => {
  vi.resetAllMocks();
  dobles.requireModulo.mockResolvedValue(PERFIL);
  dobles.prisma.job.findMany.mockResolvedValue([]);
  dobles.prisma.job.count.mockResolvedValue(0);
  dobles.prisma.job.groupBy.mockResolvedValue([]);
  dobles.prisma.corteEscaneo.groupBy.mockResolvedValue([]);
  dobles.prisma.profesor.count.mockResolvedValue(0);
  dobles.prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
  dobles.estadoScopus.mockResolvedValue({ configurada: true, origen: "Aplicación", protegida: true });
});
afterEach(() => vi.useRealTimers());

describe("revisión PR #288", () => {
  it("R1 un escaneo PENDIENTE abandonado desde hace un día NO se marca «sin avance» (hallazgo 1)", () => {
    // El escaneo avanza un profesor por petición y entre profesor y profesor queda PENDIENTE:
    // si se cierra la pestaña, el trabajo se queda aquí, no en EN_PROCESO.
    expect(estaSinAvance({ estado: "PENDIENTE", actualizadoEn: hace(24 * 60 * 60 * 1000) }, AHORA)).toBe(false);
    expect(estaSinAvance({ estado: "EN_PROCESO", actualizadoEn: hace(TIEMPO_SIN_AVANCE_MS + 1) }, AHORA)).toBe(true);
  });

  it("R2 si el servicio falla DESPUÉS del límite no hay rechazos sin atender", async () => {
    vi.useFakeTimers();
    const rechazos: unknown[] = [];
    const alRechazar = (motivo: unknown) => rechazos.push(motivo);
    process.on("unhandledRejection", alRechazar);
    try {
      const tardio = () => new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error("tarde")), 5000));
      const pendiente = comprobarServicio(tardio);
      await vi.advanceTimersByTimeAsync(LIMITE_COMPROBACION_MS);
      expect(await pendiente).toMatchObject({ responde: false, agotado: true });
      await vi.advanceTimersByTimeAsync(5000);
      await vi.runAllTimersAsync();
      expect(rechazos).toEqual([]);
    } finally {
      process.off("unhandledRejection", alRechazar);
    }
  });

  it("R3 un servicio que contesta justo antes del límite cuenta como que responde", async () => {
    vi.useFakeTimers();
    const casi = () => new Promise<string>((resolver) => setTimeout(() => resolver("ok"), LIMITE_COMPROBACION_MS - 1));
    const pendiente = comprobarServicio(casi);
    await vi.advanceTimersByTimeAsync(LIMITE_COMPROBACION_MS);
    expect(await pendiente).toMatchObject({ responde: true, agotado: false });
  });

  it("R4 /administracion/escaneo no falla si falla la lectura de la clave de Scopus", async () => {
    dobles.estadoScopus.mockRejectedValue(new Error("clave ilegible: secreto-123"));
    const pagina = await EscaneoPage();
    const html = texto(pagina);
    expect(html).toContain("no se pudo comprobar ahora");
    expect(html).not.toContain("secreto-123");
  });

  it("R5 con la clave de Scopus bien leída se sigue mostrando su estado", async () => {
    const html = texto(await EscaneoPage());
    expect(html).toContain("configurada");
    expect(html).not.toContain("no se pudo comprobar ahora");
  });

  it("R6 la tarjeta «En curso» y la etiqueta reflejan los escaneos sin avance", async () => {
    dobles.prisma.job.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    dobles.prisma.job.findMany.mockResolvedValue([
      { id: 9, estado: "EN_PROCESO", avance: 4, total: 10, creadoEn: hace(3_600_000), actualizadoEn: hace(3_000_000) },
    ]);
    const html = texto(await EscaneoPage());
    expect(html).toContain("Pendientes o en proceso; 2 sin avance");
    expect(html).toContain("Sin avance");
  });

  it("R7 el estado del sistema dice «No respondió» si la base no contesta, sin colgar la página", async () => {
    vi.useFakeTimers();
    dobles.prisma.$queryRaw.mockReturnValue(new Promise(() => {}));
    const pendiente = SistemaPage();
    await vi.advanceTimersByTimeAsync(LIMITE_COMPROBACION_MS);
    const html = texto(await pendiente);
    expect(html).toContain("No respondió en 3 segundos");
    expect(html).toContain("No responde");
  });

  it("R8 con la base sana el estado del sistema sigue mostrando «Responde»", async () => {
    const html = texto(await SistemaPage());
    expect(html).toContain("Responde");
    expect(html).not.toContain("No respondió");
  });

  it("R9 si la base no contesta, la lectura de la clave de Scopus (que usa la misma base) deja la página colgada (hallazgo 2)", async () => {
    vi.useFakeTimers();
    dobles.prisma.$queryRaw.mockReturnValue(new Promise(() => {}));
    dobles.estadoScopus.mockReturnValue(new Promise(() => {}));
    let terminada = false;
    void SistemaPage().then(() => (terminada = true));
    await vi.advanceTimersByTimeAsync(60_000);
    // Pasó un minuto y la página sigue sin responder: el límite de 3 s solo cubre el ping.
    expect(terminada).toBe(false);
  });
});
```

</details>
