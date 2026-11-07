# Prueba del PR #132: Configuración cifrada de Scopus (RF-020, issue #129)

Registro de la revisión del [PR #132](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/132) de `irybyron` (rama `feat/M6-RF-020-configuracion-scopus`, commit `5e7635b`). Cierra #129. Cambia el esquema (tabla nueva) y añade una migración.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `prisma/schema.prisma` y la migración `20261106225350_configuracion_scopus` | Tabla nueva `ConfiguracionScopus` (id, claveCifrada, actualizadaEn) con RLS y sin privilegios para `anon` ni `authenticated` |
| `src/modules/produccion/configuracion-scopus.ts` | Reglas puras: AES-256-GCM con nonce aleatorio y contexto autenticado, validación de la clave, prioridad entre la clave guardada y `SCOPUS_API_KEY`, mensajes de conexión |
| `src/app/produccion/configuracion-scopus.ts` y `configuracion/` | Persistencia, comprobación contra Scopus, Server Action solo para `ADMINISTRADOR`, página y formulario |
| `src/app/produccion/repositorio.ts` y `src/modules/produccion/escaneo.ts` | El escaneo usa la clave configurada |
| `.env.example` | Variable nueva `SCOPUS_CLAVE_MAESTRA` (vacía) |

## 2. Chequeos (copia aislada, con `main` integrado)

| Chequeo | Resultado |
|---|---|
| `npm test` | 607 pruebas pasan (50 archivos): 590 del PR y 17 de esta revisión |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó |

## 3. Pruebas de revisión: 17 de 17 pasan

Código en la sección 6.

| Id | Qué comprueba |
|---|---|
| R1 | El valor guardado no contiene la clave y tiene el formato `v1:nonce:etiqueta:contenido` |
| R2 | Dos cifrados de la misma clave difieren y ambos se abren |
| R3 | Clave maestra inválida (ausente, corta, larga, no hexadecimal) da el mensaje en español |
| R4 | Manipular nonce, etiqueta, contenido o versión, o usar otra maestra, da el mismo error seguro |
| R5 | El error no revela la clave ni el valor guardado |
| R6 | La configuración guardada manda y, si no se puede abrir, no se cae al respaldo del servidor |
| R7 a R9 | Validación de la clave (recorte, límites, caracteres) y mensajes de conexión (200 inválido, 401, 403, 429, otros) |
| A1 | Operación ausente o ajena: aviso en español y no toca nada |
| A2 | Guardar sin clave, con espacios o con símbolos no llama a Scopus ni guarda |
| A3 | Guarda la clave recortada solo después de comprobarla y refresca la pantalla |
| A4 | Sin protección de servidor no se consulta a Scopus |
| A5 | Si guardar falla, el aviso no revela el motivo ni la clave |
| A6 y A7 | Comprobar la actual: sin clave avisa; con rechazo traduce el mensaje sin mostrar la clave |
| A8 | Un rol que no es administrador se rechaza antes de leer el formulario |

## 4. Lectura real de la base (solo lectura)

- La tabla `ConfiguracionScopus` existe, con RLS activo y 0 filas; no se guardó ninguna clave.
- `anon` y `authenticated` no tienen `SELECT` ni `INSERT` sobre ella.
- Columnas: `id`, `claveCifrada` y `actualizadaEn`, todas obligatorias.
- La migración figura como aplicada, la más reciente del historial. Sin escrituras.

## 5. Hallazgos y dictamen

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | A corregir | `D-117` ya existe en `main` (permisos del coordinador sobre Profesores, PR #128). Renumerar la decisión de Scopus como la siguiente libre (D-120) y ajustar las referencias |
| 2 | A corregir | Las filas nuevas de `DECISIONES.md` y `SEGUIMIENTO.md` quedan separadas de su tabla por una línea en blanco (la fila no se muestra) y el registro de pruebas empieza con una marca BOM. Además chocan con los PR #134 y #140 |
| 3 | Menor | La clave se lee de la base y se descifra una vez por profesor en cada escaneo; basta una vez por escaneo |
| 4 | Menor | Una vez guardada una clave en la aplicación no hay forma de quitarla para volver a `SCOPUS_API_KEY`; documentarlo o añadir la acción |
| 5 | Menor | Con el [PR #140](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/140) choca en `escaneo.ts` (ver el registro del #140) |
| 6 | Aviso | Antes de usarlo hay que definir `SCOPUS_CLAVE_MAESTRA` en Vercel y guardar una copia segura; sin ella la pantalla lo avisa y no permite guardar |

**Aprobable con comentarios** una vez resueltos 1 y 2. El cifrado, la autorización y el manejo de errores son sólidos: no se encontró fuga de la clave en respuestas, mensajes ni base. No se probó: la pantalla en el navegador (claro, oscuro, celular), una comprobación real contra Scopus (no hay clave), el escaneo con la clave guardada contra la base y `npm run build` en la copia.

## 6. Código de las pruebas de revisión

<details>
<summary><code>src/modules/produccion/revision-pr132.test.ts</code></summary>

```ts
import { describe, expect, it } from "vitest";
import {
  cifrarClaveScopus,
  claveScopusEsquema,
  descifrarClaveScopus,
  mensajeConexionScopus,
  proteccionConfigurada,
  resolverClaveScopus,
} from "./configuracion-scopus";

const MAESTRA = "ab".repeat(32);
const OTRA = "cd".repeat(32);
const CLAVE = "claveFicticia_123-abc";

describe("Revisión PR #132: cifrado de la clave de Scopus", () => {
  it("R1: el valor guardado no contiene la clave y tiene el formato v1:nonce:etiqueta:contenido", () => {
    const guardado = cifrarClaveScopus(CLAVE, MAESTRA);
    expect(guardado).not.toContain(CLAVE);
    expect(guardado).not.toContain(Buffer.from(CLAVE).toString("hex"));
    const partes = guardado.split(":");
    expect(partes).toHaveLength(4);
    expect(partes[0]).toBe("v1");
    expect(partes[1]).toMatch(/^[a-f0-9]{24}$/); // nonce de 12 bytes
    expect(partes[2]).toMatch(/^[a-f0-9]{32}$/); // etiqueta de 16 bytes
    expect(descifrarClaveScopus(guardado, MAESTRA)).toBe(CLAVE);
  });

  it("R2: dos cifrados de la misma clave difieren (nonce aleatorio) y ambos se abren", () => {
    const a = cifrarClaveScopus(CLAVE, MAESTRA);
    const b = cifrarClaveScopus(CLAVE, MAESTRA);
    expect(a).not.toBe(b);
    expect(descifrarClaveScopus(a, MAESTRA)).toBe(descifrarClaveScopus(b, MAESTRA));
  });

  it("R3: la clave maestra debe ser hexadecimal de 64 caracteres; si no, mensaje en español", () => {
    for (const mala of [undefined, "", "ab".repeat(31), "ab".repeat(33), "zz".repeat(32), "ab".repeat(32) + " "]) {
      expect(proteccionConfigurada(mala)).toBe(false);
      expect(() => cifrarClaveScopus(CLAVE, mala)).toThrow("La protección de claves no está configurada en el servidor.");
    }
    expect(proteccionConfigurada("AB".repeat(32))).toBe(true);
    expect(descifrarClaveScopus(cifrarClaveScopus(CLAVE, "AB".repeat(32)), "ab".repeat(32))).toBe(CLAVE);
  });

  it("R4: manipular nonce, etiqueta, contenido o versión, o usar otra maestra, da el mismo error seguro", () => {
    const [v, nonce, etiqueta, contenido] = cifrarClaveScopus(CLAVE, MAESTRA).split(":");
    const volteo = (hex: string) => (hex[0] === "a" ? "b" : "a") + hex.slice(1);
    const MENSAJE = "No se pudo abrir la configuración de Scopus. Revisa la protección de claves del servidor.";
    const casos = [
      [v, volteo(nonce), etiqueta, contenido].join(":"),
      [v, nonce, volteo(etiqueta), contenido].join(":"),
      [v, nonce, etiqueta, volteo(contenido)].join(":"),
      ["v2", nonce, etiqueta, contenido].join(":"),
      [v, nonce, etiqueta, contenido, "extra"].join(":"),
      [v, nonce, etiqueta, ""].join(":"),
      "",
      "texto sin formato",
    ];
    for (const caso of casos) expect(() => descifrarClaveScopus(caso, MAESTRA)).toThrow(MENSAJE);
    expect(() => descifrarClaveScopus([v, nonce, etiqueta, contenido].join(":"), OTRA)).toThrow(MENSAJE);
    expect(() => descifrarClaveScopus([v, nonce, etiqueta, contenido].join(":"), undefined)).toThrow(MENSAJE);
  });

  it("R5: el mensaje de error no revela la clave ni el valor guardado", () => {
    const guardado = cifrarClaveScopus(CLAVE, MAESTRA);
    try {
      descifrarClaveScopus(guardado, OTRA);
      throw new Error("no debió abrir");
    } catch (e) {
      const texto = (e as Error).message;
      expect(texto).not.toContain(CLAVE);
      expect(texto).not.toContain(guardado);
    }
  });

  it("R6: la configuración guardada manda; con ella dañada no se cae al respaldo del servidor", () => {
    const guardado = cifrarClaveScopus(CLAVE, MAESTRA);
    expect(resolverClaveScopus(guardado, MAESTRA, "respaldo")).toBe(CLAVE);
    expect(resolverClaveScopus(undefined, MAESTRA, "respaldo")).toBe("respaldo");
    expect(resolverClaveScopus(undefined, undefined, undefined)).toBeUndefined();
    expect(() => resolverClaveScopus(guardado, OTRA, "respaldo")).toThrow();
    expect(() => resolverClaveScopus("", MAESTRA, "respaldo")).toThrow();
  });
});

describe("Revisión PR #132: validación de la clave y mensajes", () => {
  it("R7: acepta letras, números, guion y guion bajo; recorta espacios de los extremos", () => {
    expect(claveScopusEsquema.parse("  abc_DEF-123  ")).toBe("abc_DEF-123");
    expect(claveScopusEsquema.parse("a".repeat(256))).toHaveLength(256);
  });

  it("R8: rechaza vacío, solo espacios, ausente, tipo ajeno, espacios internos, símbolos y más de 256 con mensaje en español", () => {
    const mensaje = (valor: unknown) => {
      const r = claveScopusEsquema.safeParse(valor);
      return r.success ? null : r.error.issues[0].message;
    };
    expect(mensaje("")).toBe("Introduce la clave de Scopus.");
    expect(mensaje("   ")).toBe("Introduce la clave de Scopus.");
    expect(mensaje(null)).toBe("Introduce la clave de Scopus.");
    expect(mensaje(undefined)).toBe("Introduce la clave de Scopus.");
    expect(mensaje(123)).toBe("Introduce la clave de Scopus.");
    expect(mensaje("a".repeat(257))).toBe("La clave es demasiado larga.");
    for (const mala of ["abc def", "abc$def", "clave/con/barras", "ñandú", "abc\ndef", "<script>"]) {
      expect(mensaje(mala)).toBe("La clave solo admite letras, números, guiones y guiones bajos.");
    }
  });

  it("R9: los mensajes de conexión cubren 200 con cuerpo inválido, 401, 403, 429 y otros", () => {
    expect(mensajeConexionScopus(200, true)).toBeNull();
    expect(mensajeConexionScopus(200, false)).toBe("No se pudo comprobar la conexión con Scopus. Inténtalo más tarde.");
    expect(mensajeConexionScopus(401, false)).toBe("Scopus rechazó el acceso. Revisa la clave y los permisos de la cuenta.");
    expect(mensajeConexionScopus(403, false)).toBe("Scopus rechazó el acceso. Revisa la clave y los permisos de la cuenta.");
    expect(mensajeConexionScopus(429, false)).toBe("Se agotó la cuota de Scopus. Inténtalo más tarde.");
    for (const estado of [0, 408, 500, 503]) {
      expect(mensajeConexionScopus(estado, false)).toBe("No se pudo comprobar la conexión con Scopus. Inténtalo más tarde.");
    }
  });
});
```

</details>

<details>
<summary><code>src/app/produccion/configuracion/revision-pr132-acciones.test.ts</code></summary>

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dobles = vi.hoisted(() => ({
  permiso: vi.fn(),
  comprobar: vi.fn(),
  guardar: vi.fn(),
  obtener: vi.fn(),
  revalidar: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireRol: dobles.permiso }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidar }));
vi.mock("../configuracion-scopus", () => ({
  comprobarClaveScopus: dobles.comprobar,
  guardarClaveScopus: dobles.guardar,
  obtenerClaveScopus: dobles.obtener,
}));
import { configurarScopusAction } from "./actions";

function datos(campos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

describe("Revisión PR #132: acción configurarScopusAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SCOPUS_CLAVE_MAESTRA", "ab".repeat(32));
    dobles.comprobar.mockResolvedValue(null);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("A1: sin operación o con una ajena responde en español y no toca nada", async () => {
    for (const f of [datos({}), datos({ operacion: "borrar" }), datos({ operacion: "" })]) {
      const r = await configurarScopusAction({}, f);
      expect(r.error).toBe("Selecciona una operación válida.");
    }
    expect(dobles.comprobar).not.toHaveBeenCalled();
    expect(dobles.guardar).not.toHaveBeenCalled();
  });

  it("A2: guardar sin clave, con espacios o con símbolos no llama a Scopus ni guarda", async () => {
    const r1 = await configurarScopusAction({}, datos({ operacion: "guardar" }));
    expect(r1.error).toBe("Introduce la clave de Scopus.");
    const r2 = await configurarScopusAction({}, datos({ operacion: "guardar", clave: "   " }));
    expect(r2.error).toBe("Introduce la clave de Scopus.");
    const r3 = await configurarScopusAction({}, datos({ operacion: "guardar", clave: "ab cd" }));
    expect(r3.error).toBe("La clave solo admite letras, números, guiones y guiones bajos.");
    expect(dobles.comprobar).not.toHaveBeenCalled();
    expect(dobles.guardar).not.toHaveBeenCalled();
  });

  it("A3: guarda la clave ya recortada y solo tras comprobarla; refresca la pantalla", async () => {
    const r = await configurarScopusAction({}, datos({ operacion: "guardar", clave: "  nueva_clave-1  " }));
    expect(dobles.comprobar).toHaveBeenCalledWith("nueva_clave-1");
    expect(dobles.guardar).toHaveBeenCalledWith("nueva_clave-1");
    expect(dobles.comprobar.mock.invocationCallOrder[0]).toBeLessThan(dobles.guardar.mock.invocationCallOrder[0]);
    expect(dobles.revalidar).toHaveBeenCalledWith("/produccion/configuracion");
    expect(r.exito).toBe("Clave guardada. La conexión con Scopus funciona.");
    expect(JSON.stringify(r)).not.toContain("nueva_clave-1");
  });

  it("A4: sin protección de servidor no se consulta a Scopus: el aviso va antes de la red", async () => {
    vi.stubEnv("SCOPUS_CLAVE_MAESTRA", "corta");
    const r = await configurarScopusAction({}, datos({ operacion: "guardar", clave: "clave1" }));
    expect(r.error).toBe("Falta configurar la protección de claves en el servidor.");
    expect(dobles.comprobar).not.toHaveBeenCalled();
    expect(dobles.guardar).not.toHaveBeenCalled();
  });

  it("A5: si guardar falla, el aviso no revela el motivo ni la clave y no se refresca", async () => {
    dobles.guardar.mockRejectedValue(new Error("password authentication failed for user postgres clave1"));
    const r = await configurarScopusAction({}, datos({ operacion: "guardar", clave: "clave1" }));
    expect(r.error).toBe(
      "No se pudo completar la operación. La configuración anterior se conserva si no se guardó el cambio.",
    );
    expect(JSON.stringify(r)).not.toContain("postgres");
    expect(JSON.stringify(r)).not.toContain("clave1");
    expect(dobles.revalidar).not.toHaveBeenCalled();
  });

  it("A6: comprobar la actual sin clave configurada avisa y no consulta a Scopus", async () => {
    dobles.obtener.mockResolvedValue(undefined);
    const r = await configurarScopusAction({}, datos({ operacion: "comprobar-actual" }));
    expect(r.error).toBe("Todavía no hay una clave configurada.");
    expect(dobles.comprobar).not.toHaveBeenCalled();
  });

  it("A7: comprobar la actual devuelve el mensaje del proveedor traducido, sin la clave", async () => {
    dobles.obtener.mockResolvedValue("actual_ficticia");
    dobles.comprobar.mockResolvedValue("Scopus rechazó el acceso. Revisa la clave y los permisos de la cuenta.");
    const r = await configurarScopusAction({}, datos({ operacion: "comprobar-actual" }));
    expect(r.error).toContain("Scopus rechazó el acceso");
    expect(JSON.stringify(r)).not.toContain("actual_ficticia");
  });

  it("A8: cualquier rol distinto de ADMINISTRADOR se rechaza antes de leer el formulario", async () => {
    dobles.permiso.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(configurarScopusAction({}, datos({ operacion: "guardar", clave: "clave1" }))).rejects.toThrow();
    expect(dobles.permiso).toHaveBeenCalledWith(["ADMINISTRADOR"]);
    expect(dobles.comprobar).not.toHaveBeenCalled();
    expect(dobles.obtener).not.toHaveBeenCalled();
  });
});
```

</details>
