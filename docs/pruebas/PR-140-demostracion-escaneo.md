# Prueba del PR #140: Demostración del escaneo con datos ficticios (RF-020, issue #139)

Registro de la revisión del [PR #140](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/140) de `irybyron` (rama `feat/M6-RF-020-demo-pr139`, commit `d1a65c2`). Cierra #139. Apilado sobre el [PR #134](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/134) (su base es la rama de ese PR). Sin cambios de esquema.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `src/modules/produccion/demostracion.ts` | Simulación en memoria con dos profesores ficticios y dos obras; reutiliza el motor real inyectando conectores y repositorio |
| `src/modules/produccion/escaneo.ts` | `ejecutarEscaneo` recibe los conectores como tercer parámetro (por omisión los reales) |
| `src/app/produccion/demostracion/` | Página, formulario y Server Action; solo con `NODE_ENV=development` y `PRODUCCION_DEMO=1` |
| `src/app/produccion/escaneo/page.tsx` | Enlace a la demostración cuando está habilitada |

## 2. Chequeos (copia aislada, con `main` integrado)

| Chequeo | Resultado |
|---|---|
| `npm test` | 600 pruebas pasan (50 archivos): 589 del PR (incluye las del #134) y 11 de esta revisión |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó |

## 3. Pruebas de revisión: 11 de 11 pasan

Código en la sección 5.

| Id | Qué comprueba |
|---|---|
| D1 | Solo se habilita en development con la bandera `1`; production, test y otros valores quedan bloqueados |
| D2 | El módulo y la acción no importan Prisma, `fetch`, `process.env` ni la capa de datos reales |
| D3 | El estado que llega del navegador se acota: más de dos obras, ids, estados o títulos ajenos se rechazan |
| D4 | Operación y año se validan con mensajes en español |
| D5 | Flujo completo: historial, repetición sin duplicados, coautoría, estados conservados y reinicio |
| D6 | Validar sin haber escaneado avisa y no inventa filas; no muta la memoria recibida |
| D7 | Todo el contenido está marcado `[DEMO]` y usa DOI de prueba |
| X1 | El permiso del módulo se exige primero, incluso con la demostración apagada |
| X2 | En production o Preview con la bandera activa sigue bloqueada |
| X3 | Un estado manipulado se rechaza con mensaje en español |
| X4 | En desarrollo devuelve obras ficticias y explica un año inválido |

## 4. Hallazgos y dictamen

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | A corregir | **Choca con el PR #132** en `src/modules/produccion/escaneo.ts` (ambos cambian la llamada a Scopus). Lo debe resolver el que se integre después; la combinación correcta es `conectores.consultarScopus(profesor, anio, clave)` |
| 2 | A corregir | Tras integrar el #134, cambiar la base de este PR a `main` (`gh pr edit 140 --base main`) y fusionar `main`; `DECISIONES.md` y `SEGUIMIENTO.md` repiten las filas del #134 |
| 3 | A corregir | Mismas filas de tabla separadas por línea en blanco y registro de pruebas con marca BOM que en el #134 |
| 4 | Menor | El estado de la simulación viaja por el navegador; está acotado y validado, por lo que no es riesgo, pero la demostración solo sirve para una pestaña |

**Aprobable con comentarios.** Nunca toca la base: ni importa Prisma ni se habilita fuera de desarrollo. No se probó: la pantalla en el navegador (claro, oscuro, celular), la ejecución local con `PRODUCCION_DEMO=1` y `npm run build` en la copia.

## 5. Código de las pruebas de revisión

<details>
<summary><code>src/modules/produccion/revision-pr140.test.ts</code></summary>

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  demoHabilitada, ejecutarDemostracion, memoriaDemoEsquema, memoriaDemoVacia, solicitudDemoEsquema,
} from "./demostracion";

describe("Revisión PR #140: demostración aislada", () => {
  it("D1: solo se habilita en development con PRODUCCION_DEMO=1", () => {
    const casos: [string | undefined, string | undefined, boolean][] = [
      ["development", "1", true], ["development", undefined, false], ["development", "true", false],
      ["development", "0", false], ["production", "1", false], ["test", "1", false], [undefined, "1", false],
    ];
    for (const [entorno, bandera, esperado] of casos) expect(demoHabilitada(entorno, bandera)).toBe(esperado);
  });

  it("D2: el módulo y la acción no importan Prisma, fetch ni la capa de datos reales", () => {
    const fuente = readFileSync("src/modules/produccion/demostracion.ts", "utf8");
    expect(fuente).not.toMatch(/prisma|@\/lib|fetch\(|process\.env|repositorio|trabajos/i);
    const accion = readFileSync("src/app/produccion/demostracion/actions.ts", "utf8");
    expect(accion).not.toMatch(/prisma|repositorioPrisma/i);
  });

  it("D3: el estado recibido del navegador se acota (más de 2 obras, ids ajenos, estados ajenos se rechazan)", () => {
    const ok = memoriaDemoVacia();
    expect(memoriaDemoEsquema.safeParse(ok).success).toBe(true);
    const obra = (id: number) => ({ id, titulo: "x", doi: "d", anio: 2020 });
    expect(memoriaDemoEsquema.safeParse({ ...ok, obras: [obra(1), obra(2), obra(1)] }).success).toBe(false);
    expect(memoriaDemoEsquema.safeParse({ ...ok, obras: [obra(3)] }).success).toBe(false);
    expect(memoriaDemoEsquema.safeParse({ ...ok, autorias: [{ publicacionId: 1, profesorId: 1, estado: "OTRO" }] }).success).toBe(false);
    expect(memoriaDemoEsquema.safeParse({ ...ok, obras: [{ ...obra(1), titulo: "x".repeat(151) }] }).success).toBe(false);
    expect(memoriaDemoEsquema.safeParse(null).success).toBe(false);
    expect(memoriaDemoEsquema.safeParse(undefined).success).toBe(false);
  });

  it("D4: la solicitud valida operación y año con mensajes en español", () => {
    const mensaje = (v: unknown) => {
      const r = solicitudDemoEsquema.safeParse(v);
      return r.success ? null : r.error.issues[0].message;
    };
    expect(mensaje({ operacion: "borrar-todo", anio: "" })).toBe("Selecciona una operación de demostración.");
    expect(mensaje({ anio: "" })).toBe("Selecciona una operación de demostración.");
    expect(mensaje({ operacion: "reiniciar", anio: "1800" })).toBe("Indica un año entre 1900 y 2099 o deja el campo vacío.");
    expect(mensaje({ operacion: "reiniciar", anio: "20x5" })).toBe("Indica un año entre 1900 y 2099 o deja el campo vacío.");
    expect(mensaje({ operacion: "reiniciar", anio: null })).toBe("Indica un año válido.");
    expect(mensaje({ operacion: "escanear-1", anio: "2018" })).toBeNull();
    expect(mensaje({ operacion: "escanear-1", anio: "" })).toBeNull();
  });

  it("D5: flujo completo: historial, repetición sin duplicados, coautoría y estados conservados", async () => {
    let m = memoriaDemoVacia();
    let r = await ejecutarDemostracion(m, "escanear-1");
    m = r.memoria;
    expect(m.obras).toHaveLength(2);
    expect(m.autorias).toHaveLength(2);
    expect([...r.fuentesConsultadas!].sort()).toEqual(["OPENALEX: historial completo", "ORCID: historial completo"]);
    r = await ejecutarDemostracion(m, "escanear-1");
    m = r.memoria;
    expect(m.obras).toHaveLength(2);
    expect(m.autorias).toHaveLength(2);
    r = await ejecutarDemostracion(m, "escanear-2");
    m = r.memoria;
    expect(m.obras).toHaveLength(2);
    expect(m.autorias).toHaveLength(4);
    r = await ejecutarDemostracion(m, "validar-1");
    r = await ejecutarDemostracion(r.memoria, "rechazar-2");
    m = r.memoria;
    expect(m.autorias.filter((a) => a.profesorId === 1).every((a) => a.estado === "VALIDADA")).toBe(true);
    expect(m.autorias.filter((a) => a.profesorId === 2).every((a) => a.estado === "RECHAZADA")).toBe(true);
    r = await ejecutarDemostracion(m, "escanear-1", 2018);
    expect(r.memoria.autorias.filter((a) => a.profesorId === 1).every((a) => a.estado === "VALIDADA")).toBe(true);
    const fin = await ejecutarDemostracion(r.memoria, "reiniciar");
    expect(fin.memoria).toEqual(memoriaDemoVacia());
  });

  it("D6: validar sin haber escaneado avisa y no inventa filas; no se muta la memoria recibida", async () => {
    const vacia = memoriaDemoVacia();
    const r = await ejecutarDemostracion(vacia, "validar-1");
    expect(r.mensaje).toBe("Primero escanea a ese profesor de demostración.");
    expect(r.memoria.autorias).toHaveLength(0);
    const escaneada = (await ejecutarDemostracion(vacia, "escanear-1")).memoria;
    const copia = structuredClone(escaneada);
    await ejecutarDemostracion(escaneada, "validar-1");
    expect(escaneada).toEqual(copia);
  });

  it("D7: todo el contenido ficticio está marcado [DEMO] y usa un DOI de prueba", async () => {
    const m = (await ejecutarDemostracion(memoriaDemoVacia(), "escanear-1")).memoria;
    for (const o of m.obras) {
      expect(o.titulo.startsWith("[DEMO]")).toBe(true);
      expect(o.doi.startsWith("10.0000/demo.")).toBe(true);
    }
  });
});
```

</details>

<details>
<summary><code>src/app/produccion/demostracion/revision-pr140-acciones.test.ts</code></summary>

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dobles = vi.hoisted(() => ({ permiso: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.permiso }));
import { demostrarEscaneoAction } from "./actions";
import { memoriaDemoVacia } from "@/modules/produccion/demostracion";

function f(campos: Record<string, string>) {
  const d = new FormData();
  for (const [k, v] of Object.entries(campos)) d.set(k, v);
  return d;
}

describe("Revisión PR #140: Server Action de la demostración", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.permiso.mockResolvedValue({});
  });
  afterEach(() => vi.unstubAllEnvs());

  it("X1: el permiso del módulo se exige primero, incluso con la demostración apagada", async () => {
    dobles.permiso.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(demostrarEscaneoAction({ memoria: memoriaDemoVacia() }, f({ operacion: "escanear-1" }))).rejects.toThrow();
    expect(dobles.permiso).toHaveBeenCalledWith("produccion");
  });

  it("X2: en production o Preview, con la bandera activa, sigue bloqueada y no ejecuta nada", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PRODUCCION_DEMO", "1");
    const r = await demostrarEscaneoAction({ memoria: memoriaDemoVacia() }, f({ operacion: "escanear-1" }));
    expect(r.error).toBe("La demostración solo está disponible en desarrollo cuando se habilita expresamente.");
    expect(r.memoria).toEqual(memoriaDemoVacia());
  });

  it("X3: en development con bandera, un estado manipulado se rechaza con mensaje en español", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PRODUCCION_DEMO", "1");
    const mala = { memoria: { obras: [{ id: 9, titulo: "x", doi: "d", anio: 1 }], autorias: [], cortes: [] } };
    const r = await demostrarEscaneoAction(mala as never, f({ operacion: "escanear-1" }));
    expect(r.error).toBe("Revisa la operación y el año de demostración. Si el estado no es válido, reinicia la prueba.");
    expect(r.memoria).toEqual(memoriaDemoVacia());
    const sinEstado = await demostrarEscaneoAction(undefined as never, f({ operacion: "escanear-1" }));
    expect(sinEstado.error).toBeDefined();
  });

  it("X4: en development con bandera, escanear devuelve obras ficticias y un año inválido se explica", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PRODUCCION_DEMO", "1");
    const ok = await demostrarEscaneoAction({ memoria: memoriaDemoVacia() }, f({ operacion: "escanear-1" }));
    expect(ok.memoria.obras).toHaveLength(2);
    const mal = await demostrarEscaneoAction(ok, f({ operacion: "escanear-1", anio: "abcd" }));
    expect(mal.error).toBeDefined();
    expect(mal.memoria.obras).toHaveLength(2);
  });
});
```

</details>
