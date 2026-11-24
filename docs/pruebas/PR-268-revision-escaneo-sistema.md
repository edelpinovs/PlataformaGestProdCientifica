# Revisión del PR #268: panel de administración, fase 3, control del escaneo y estado del sistema (#243)

Revisión detallada del [PR #268](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/268) de `edelpinovs`. Amplía lo dicho sobre este PR en [PR-263-269-panel-administracion.md](PR-263-269-panel-administracion.md). El registro que dejó quien lo preparó está en su rama (`PR-268-admin-fase3-escaneo-sistema.md`).

| Campo | Valor |
|---|---|
| PR | #268 (refs #243; no lo cierra) |
| Autor | @edelpinovs |
| Rama | `feat/M1-administracion-escaneo-parametros` → `main` (el #267 ya se integró y GitHub reapuntó la base) |
| Commit revisado | `edbedd3` |
| Fecha de la revisión | 2026-11-23 |
| Revisó | Edel Pino (con Claude Code). Es el mismo dueño que preparó el PR: **otra persona debe aprobarlo** |
| Entorno | Local (Windows 10, Node 24), copia aislada de la rama (`git worktree`) con `npm ci`, `prisma generate` y las variables de relleno del CI. Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** Tres puntos de código y dos de documentación; ninguno bloquea |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/administracion/escaneo.ts` (+ prueba) | Resume los trabajos de escaneo (último, en curso, completados e incidencias de 30 días) y los cortes por fuente |
| `src/modules/administracion/sistema.ts` (+ prueba) | Comprobación de la base con tiempo de respuesta, nombre del entorno y versión corta |
| `src/app/administracion/escaneo/page.tsx` | Tarjetas, tabla por fuente, cinco últimos escaneos y enlaces a Producción |
| `src/app/administracion/sistema/page.tsx` | Servicios (base, clave de Scopus, protección de claves) y versión desplegada |
| `src/app/administracion/page.tsx` | Tarjetas de inicio |

No hay cambios de esquema, migración ni dependencias nuevas. Reutiliza `TIPOS_ESCANEO`, `ESTADOS_HISTORIAL`, `FUENTES_ESCANEO` y `estadoConfiguracionScopus` de Producción en lugar de copiarlos.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `prisma validate` | Correcto |
| `npm test` | Correcto: 108 archivos, 1196 pruebas (16 nuevas, 1180 → 1196) |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto; compila `/administracion/escaneo` y `/administracion/sistema` |

Con mi prueba de revisión (sección 4) la suite queda en 109 archivos y 1211 pruebas, todas correctas; esa prueba **no** forma parte del PR. La descripción dice que falla `produccion/conectores/http.test.ts` (1195 de 1196) y que solo corre con `--pool=vmThreads`: aquí pasó completa con la configuración por defecto.

## 3. Lo que se leyó y está bien

- **Permisos:** las dos páginas empiezan con `requireModulo("administracion")`, que es solo `ADMINISTRADOR`. No hay Server Actions: ambas pantallas son de solo lectura.
- **Seguridad de la información:** el estado del sistema solo dice si algo responde o está configurado. No muestra valores de variables de entorno, claves ni mensajes de error de librerías (E11 lo comprueba: un error con «password…» no aparece en el resultado).
- **Enlaces:** `/produccion/escaneo`, `/historial?registro=<id>`, `/continuidad` y `/configuracion` existen. El rol `ADMINISTRADOR` entra a los tres primeros (`requireModulo("produccion")` admite administrador y coordinador) y `configuración` es solo de administrador, así que ningún botón lleva a un rechazo.
- **El aviso es veraz:** «solo Coordinación puede iniciar, reintentar o continuar un escaneo» coincide con `requireRol(["COORDINADOR"])` en `iniciarEscaneoAction`.
- **Cortes por fuente:** `CorteEscaneo` tiene clave `(profesorId, fuente)`, así que `groupBy` cuenta un corte por profesor y fuente; se cuentan solo profesores activos y las cinco fuentes de `FUENTES_ESCANEO` existen en el enum `FuentePublicacion`.
- **Excepción a D-009:** el listado de los cinco últimos escaneos es fijo y acotado, con enlace al historial paginado; está justificada en la descripción. Sin Editar ni Eliminar: son resúmenes, no registros.
- **Mensajes:** todo el texto visible está en español y los estados vienen de `ESTADOS_HISTORIAL`.

## 4. Pruebas de revisión

Archivo `src/modules/administracion/revision-pr268.test.ts` (código en la sección 7). Quince pruebas, todas correctas contra la rama: cada una **fija** un comportamiento, a veces para dejar constancia de un hallazgo.

| # | Prueba | Resultado |
|---|---|---|
| E1 | Un trabajo en proceso de hace 90 días sigue contando como «en curso» | ✓ (hallazgo 1) |
| E2 | La ventana de 30 días incluye el límite y excluye un día más | ✓ |
| E3 | «Con incidencias» cuenta solo `FALLIDO`; el último ignora la ventana | ✓ |
| E4 | Con la misma fecha, el último es el de mayor id | ✓ |
| E5 | Sin trabajos todo es cero y no hay último | ✓ |
| E6 | Siempre salen las cinco fuentes, aunque no haya cortes | ✓ |
| E7 | Una fuente que no es de escaneo (`MANUAL`) se ignora | ✓ |
| E8 | «Sin buscar» nunca es negativo | ✓ |
| E9 | Texto de avance: singular, plural y lote vacío | ✓ |
| E10 | Un avance mayor que el total se muestra tal cual («45 de 40») | ✓ |
| E11 | Un fallo del servicio se convierte en «no responde» sin filtrar el error | ✓ |
| E12 | No hay límite de tiempo: un servicio que nunca responde deja la comprobación pendiente | ✓ (hallazgo 2) |
| E13 | Un reloj que retrocede no da milisegundos negativos | ✓ |
| E14 | Un entorno desconocido de Vercel se muestra como «Local» | ✓ |
| E15 | La versión se recorta a 7 caracteres y se ignora el texto vacío | ✓ |

## 5. Hallazgos

1. **«En curso» cuenta trabajos de cualquier antigüedad.** `resumirTrabajos` suma todo `PENDIENTE` o `EN_PROCESO` que recibe, sin mirar la fecha (E1). Si un escaneo se queda trabado, la tarjeta dirá «En curso: 1» hasta que alguien lo continúe. `crearTrabajoEscaneo` rechaza iniciar otro escaneo mientras exista un pendiente (la Coordinación puede continuarlo, y Producción retoma un `EN_PROCESO` sin actualizar desde hace más de `TIEMPO_RESERVA_MS`, 10 minutos), pero el panel no distingue un escaneo vivo de uno trabado. Convendría marcar como «sin avance» al que no se actualiza desde hace ese tiempo usando `actualizadoEn`, que el resumen ya recibe.
2. **La comprobación de la base no tiene límite de tiempo.** Si la base no responde, `comprobarServicio` espera hasta que la plataforma corte la petición (E12) y la página no muestra «No responde»: justo cuando más falta hace. Un `Promise.race` con 3 a 5 segundos devolvería `{ responde: false }`.
3. **`/administracion/escaneo` no protege la lectura de la clave de Scopus.** La página llama a `estadoConfiguracionScopus()` sin `.catch`, mientras que `/administracion/sistema` sí lo hace (`.catch(() => null)`). Si esa lectura falla (por ejemplo, error al descifrar), la pantalla de escaneo muestra el error genérico de Next.js en lugar de «sin configurar».
4. **Los conteos de la ventana salen de los 200 trabajos más recientes** (`take: 200`). Con un escaneo diario más los manuales, 30 días caben de sobra, pero si esa cifra creciera, «Completados» e «Incidencias» se quedarían cortos sin avisar. Un `count` por estado dentro de la ventana lo haría exacto y evitaría el `trabajos as TrabajoResumen[]`.
5. **La descripción está desactualizada.** Dice «Depende del PR #267, … su base es la rama de la fase 2». El #267 ya se integró y la base es `main`. Además repite que falla `produccion/conectores/http.test.ts` (aquí pasa).
6. **Las páginas nuevas no tienen prueba de permisos.** `requireModulo("administracion")` está en ambas, pero ninguna prueba lo asegura (Producción sí tiene pruebas de página, como `configuracion/page.test.tsx`). RNF-005 se cumple en el código; una prueba pequeña por página evitaría que se pierda en un cambio futuro.

## 6. Lo que no se probó

- **Las pantallas en el navegador** (claro, oscuro y celular): `/administracion/escaneo` y `/administracion/sistema`, incluida la tabla por fuente apilada en celular.
- **Contra la base real:** el `groupBy` de cortes, el `count` de profesores activos y la lectura de trabajos. Las pruebas son de funciones puras; no hay prueba de las páginas.
- **Con datos de escaneo reales:** cómo se ven las tarjetas con un escaneo en curso o con incidencias.
- **El estado «No responde»:** no se provocó una caída de la base.

## 7. Código de la prueba de revisión

<details>
<summary><code>src/modules/administracion/revision-pr268.test.ts</code></summary>

```ts
// Revisión del PR #268: casos que las pruebas del PR no cubren.
import { describe, expect, it } from "vitest";
import { resumirFuentes, resumirTrabajos, textoAvance, type TrabajoResumen } from "./escaneo";
import { comprobarServicio, nombreEntorno, versionCorta } from "./sistema";

const DIA = 24 * 60 * 60 * 1000;
const ahora = new Date("2026-11-23T12:00:00Z");
const hace = (dias: number) => new Date(ahora.getTime() - dias * DIA);
const trabajo = (id: number, estado: TrabajoResumen["estado"], dias: number): TrabajoResumen => ({
  id, estado, avance: 0, total: 10, creadoEn: hace(dias), actualizadoEn: hace(dias),
});

describe("resumirTrabajos", () => {
  it("E1: un trabajo en proceso de hace 90 días sigue contando como «en curso»", () => {
    expect(resumirTrabajos([trabajo(1, "EN_PROCESO", 90)], ahora).enCurso).toBe(1);
  });

  it("E2: la ventana de 30 días incluye el límite y excluye un día más", () => {
    const r = resumirTrabajos([trabajo(1, "COMPLETADO", 30), trabajo(2, "COMPLETADO", 31)], ahora);
    expect(r.completados).toBe(1);
  });

  it("E3: «con incidencias» cuenta solo FALLIDO, y el último ignora la ventana", () => {
    const r = resumirTrabajos([trabajo(1, "FALLIDO", 40), trabajo(2, "FALLIDO", 2), trabajo(3, "COMPLETADO", 1)], ahora);
    expect(r.conIncidencias).toBe(1);
    expect(r.ultimo?.id).toBe(3);
  });

  it("E4: con la misma fecha, el último es el de mayor id", () => {
    expect(resumirTrabajos([trabajo(1, "COMPLETADO", 1), trabajo(2, "COMPLETADO", 1)], ahora).ultimo?.id).toBe(2);
  });

  it("E5: sin trabajos no hay último y todo es cero", () => {
    expect(resumirTrabajos([], ahora)).toEqual({ ultimo: null, enCurso: 0, completados: 0, conIncidencias: 0 });
  });
});

describe("resumirFuentes", () => {
  it("E6: devuelve las cinco fuentes aunque no haya cortes, con todos sin buscar", () => {
    const f = resumirFuentes([], 40);
    expect(f.map((x) => x.fuente)).toEqual(["ORCID", "OPENALEX", "SCOPUS", "CROSSREF", "GOOGLE_SCHOLAR"]);
    expect(f.every((x) => x.sinCorte === 40 && x.ultimaFecha === null)).toBe(true);
  });

  it("E7: una fuente que no es de escaneo (MANUAL) se ignora", () => {
    const f = resumirFuentes([{ fuente: "MANUAL", profesores: 5, ultimaFecha: ahora }], 10);
    expect(f.every((x) => x.profesoresConCorte === 0)).toBe(true);
  });

  it("E8: si hay más cortes que profesores activos, «sin buscar» no es negativo", () => {
    expect(resumirFuentes([{ fuente: "ORCID", profesores: 12, ultimaFecha: ahora }], 10)[0].sinCorte).toBe(0);
  });
});

describe("textoAvance", () => {
  it("E9: singular, plural y lote vacío", () => {
    expect(textoAvance(1, 1)).toBe("1 de 1 profesor revisado");
    expect(textoAvance(12, 40)).toBe("12 de 40 profesores revisados");
    expect(textoAvance(0, 0)).toBe("Sin profesores en el lote");
  });

  it("E10: un avance mayor que el total se muestra tal cual", () => {
    expect(textoAvance(45, 40)).toBe("45 de 40 profesores revisados");
  });
});

describe("sistema", () => {
  it("E11: un fallo del servicio se convierte en «no responde» sin propagar el error", async () => {
    const r = await comprobarServicio(async () => {
      throw new Error("password authentication failed for user postgres");
    });
    expect(r.responde).toBe(false);
    expect(JSON.stringify(r)).not.toContain("password");
  });

  it("E12: no hay límite de tiempo: un servicio que nunca responde deja la comprobación pendiente", async () => {
    const colgado = comprobarServicio(() => new Promise(() => {}));
    const espera = new Promise<string>((resolver) => setTimeout(() => resolver("pendiente"), 50));
    expect(await Promise.race([colgado.then(() => "terminó"), espera])).toBe("pendiente");
  });

  it("E13: un reloj que retrocede no da milisegundos negativos", async () => {
    let t = 100;
    const r = await comprobarServicio(async () => {}, () => (t -= 10));
    expect(r.milisegundos).toBe(0);
  });

  it("E14: un entorno desconocido de Vercel se muestra como «Local»", () => {
    expect(nombreEntorno("staging")).toBe("Local");
    expect(nombreEntorno("production")).toBe("Producción");
    expect(nombreEntorno(undefined)).toBe("Local");
  });

  it("E15: la versión se recorta a 7 caracteres y se ignora el texto vacío", () => {
    expect(versionCorta("  0123456789abcdef ")).toBe("0123456");
    expect(versionCorta("   ")).toBeNull();
    expect(versionCorta(undefined)).toBeNull();
  });
});
```

</details>

## 8. Dictamen

**Aprobable con comentarios.** Pasa todas las verificaciones y las reglas del equipo en permisos, seguridad de la información y reutilización de las piezas de Producción. Antes de integrar conviene corregir los hallazgos 1 a 3 (trabajos viejos en «en curso», límite de tiempo de la base y `.catch` en la página de escaneo) y actualizar la descripción (5); los demás pueden ir en un ajuste posterior. Queda pendiente ver las pantallas en los tres modos y que otra persona lo apruebe.
