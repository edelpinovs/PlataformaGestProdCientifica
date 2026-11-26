# Revisión del PR #289: filtro «Año de publicación» desde el año actual (#252)

Revisión independiente del [PR #289](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/289) de `irybyron` (I6), que cierra el issue [#252](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/252) (origen: reunión con el cliente del 2026-11-23).

| Campo | Valor |
|---|---|
| PR | #289 (`Closes #252`) |
| Autor | @irybyron (I6) |
| Rama | `feat/M6-RF-PC-10-filtro-anio-252` → `main` |
| Commit revisado | `de46756` |
| Fecha de la revisión | 2026-11-24 |
| Revisó | @edelpinovs (I1), con Claude Code |
| Entorno | Local (Windows 10, Node 24): la rama del PR mezclada con `main` en `ab8a862` (trae #288 y #291), con el cliente de Prisma generado. Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** Cumple los tres puntos del *Terminado cuando*; queda un hallazgo menor (el año se calcula en UTC). **El hallazgo 1 quedó corregido en `a3a4674` y el PR se integró en `b251458`** (ver el apartado 9) |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/produccion/consulta.ts` | `opcionesAnioPublicacion(anioActual)` (del año actual a 1900, descendente) y `analizarConsulta(parametros, anioActual)` valida el mismo intervalo con mensaje en español |
| `src/app/produccion/publicaciones/page.tsx` | Calcula `anioActual` en el servidor (`getUTCFullYear()`) y lo pasa a la validación y al filtro |
| `src/app/produccion/filtros-publicaciones.tsx` | El filtro usa `opcionesAnioPublicacion` en lugar de las 201 opciones fijas (2100 a 1900) |
| `src/modules/produccion/consulta.test.ts` | Dos pruebas: la lista de 2026 a 1900 y la validación del intervalo |
| `src/app/produccion/selector-profesor.navegador.mjs` | La prueba en Chrome comprueba que 2026 encabeza la lista y que termina en 1900 |

Sin cambios de esquema, migraciones ni dependencias. Todo queda en el módulo `produccion`, que es de I6.

## 2. *Terminado cuando* del #252

| Criterio | Cumple | Evidencia |
|---|---|---|
| La primera opción es el año en curso, calculado en el servidor, y la lista baja desde ahí | Sí | `page.tsx` calcula el año en el servidor; R1 y la prueba en Chrome |
| La lista de años sale de una función pura con su prueba | Sí | `opcionesAnioPublicacion` con su prueba en `consulta.test.ts` |
| Un año fuera de rango en la URL da mensaje en español | Sí | «Indica un año entre 1900 y 2026.»; R2 y R3 |

El issue también pedía revisar el campo de año del formulario de escaneo «si corresponde». El PR lo deja igual y remite al #266 (periodos en el escaneo); ver el hallazgo 2.

## 3. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (PR mezclado con `main`) | Correcto: 113 archivos, 1289 pruebas |
| `npx vitest run consulta` | Correcto: 43 pruebas, incluidas las dos nuevas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| `node src/app/produccion/selector-profesor.navegador.mjs` (Chrome aislado) | Correcto en claro, oscuro y celular: «años en orden descendente, profesor opcional, filtros y orden conservados, página reiniciada» |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Mezcla con `main` | La rama no trae #288 ni #291, pero GitHub la marca sin conflictos y todo pasa con la mezcla |

**Nota para quien repita la prueba en Windows:** si la terminal abre el proyecto como `c:\…` (minúscula), Vitest carga dos copias de sí mismo y los 113 archivos fallan con `Cannot read properties of undefined (reading 'config')`, sin correr ninguna prueba. Con `C:\…` pasan. No tiene que ver con el PR.

## 4. Lo que se leyó y está bien

- **Un solo intervalo:** las opciones del filtro y la validación de la URL usan la misma constante (`ANIO_MINIMO_PUBLICACION`) y el mismo `anioActual`, así que no se puede ofrecer un año que luego se rechace, ni al revés.
- **Año inválido en la URL:** se muestra el aviso, el filtro de año se vacía, los demás filtros se conservan y no se consulta la base con un valor fuera de rango (`analisis.success ? consultarPublicaciones(...) : null`).
- **Permiso:** `requireModulo("produccion")` sigue siendo lo primero en la página.
- **Compatibilidad:** `analizarConsulta` conserva un valor por omisión para `anioActual`, así que nadie más tiene que cambiar su llamada; hoy solo la usa `publicaciones/page.tsx`.

## 5. Pruebas de revisión

Archivo temporal `src/modules/produccion/revision-289.test.ts`, que se borró después (el código está al final). Las 6 pasan. R5 **demuestra el hallazgo 1**: pasa porque el comportamiento es el del hallazgo, no porque esté bien.

| # | Qué comprueba | Resultado |
|---|---|---|
| R1 | 127 opciones de 2026 a 1900, de uno en uno y sin repetidos | Pasa |
| R2 | `anio=2027` con año actual 2026: mensaje en español, el año no se aplica y el filtro de tipo se conserva | Pasa |
| R3 | Valores manipulados (`1899`, `abcd`, `02025`, ` 2025` y dos años a la vez) dan mensaje en español | Pasa |
| R4 | Sin año en la URL no hay error ni filtro | Pasa |
| R5 | El 31 de diciembre de 2026 a las 19:00 en Jalisco (1 de enero de 2027 en UTC) ya se acepta 2027 | Pasa (demuestra el hallazgo 1) |
| R6 | Con año actual 1900 hay una sola opción, y antes de 1900 la lista queda vacía sin fallar | Pasa |

## 6. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Menor | El año actual se calcula en UTC (`getUTCFullYear()`, en `page.tsx` y como valor por omisión de `analizarConsulta`). En Jalisco (UTC−6), del 31 de diciembre a las 18:00 a la medianoche, el filtro ya ofrece y acepta el año siguiente (R5). El resto de la aplicación muestra las fechas en `America/Mexico_City` | Calcular el año con `Intl.DateTimeFormat` en `America/Mexico_City` en un solo lugar y usarlo en la página y en el valor por omisión. El efecto es poco (seis horas al año y un filtro sin resultados), así que no bloquea |
| 2 | Observación | El campo de año del escaneo sigue de 1990 a 2100 (`src/modules/produccion/lotes.ts`). El PR remite al #266, pero el #266 trata de rangos y no menciona el tope del año actual | Anotarlo en el #266 para que el rango de búsqueda tampoco acepte años futuros |
| 3 | Observación | Otros campos de año siguen hasta 2100: cuerpos académicos (`cuerpo.ts`), reportes (`convocatoria.ts`, `vigencias.ts`) y los conectores de escaneo. Ahí puede tener sentido un año futuro (vencimientos, convocatorias), así que quedan fuera de este issue | Sin acción en este PR |

## 7. Lo que no se probó

- **La vista previa con sesión** (`/produccion/publicaciones` y `?anio=2027`): la vista previa pide iniciar sesión y la revisión no usó credenciales. El autor también la dejó pendiente. Lo revisa una persona con su cuenta.
- **La pantalla real en el navegador** con `next dev`: solo se probó el componente en Chrome aislado, en claro, oscuro y celular, con datos ficticios.
- **La consulta con filtro de año** contra la base real: no cambió en este PR.

## 8. Dictamen

**Aprobable con comentarios.** El PR cumple el #252 y no rompe nada. El hallazgo 1 es menor y puede corregirse aquí o en otro issue; el 2 conviene anotarlo en el #266. Falta la aprobación en GitHub y revisar la vista previa con sesión.

## 9. Actualización: hallazgo 1 corregido (`a3a4674`) e integración (`b251458`), 2026-11-24

Después de esta revisión, la autora corrigió el hallazgo 1 en el mismo PR y el PR se integró a `main`. Se volvió a comprobar así:

| Verificación | Resultado |
|---|---|
| Qué cambió | `anioActualMexico()` en `src/modules/produccion/fechas-escaneo.ts` calcula el año con `Intl.DateTimeFormat` en `ZONA_FECHAS_ESCANEO` (Ciudad de México). Lo usan `publicaciones/page.tsx` y el valor por omisión de `analizarConsulta`, en un solo lugar, como se propuso |
| Pruebas nuevas de la autora (`fechas-escaneo.test.ts`) | El 31 de diciembre por la noche sigue siendo el mismo año, y el año cambia a la medianoche de Ciudad de México |
| Mis pruebas de revisión sobre `main` con la corrección | **5 de 6 pasan y R5 falla**, que es lo esperado: R5 afirmaba que la noche del 31 de diciembre ya se aceptaba el año siguiente, y ahora se rechaza. Con `consulta.test.ts` y `fechas-escaneo.test.ts`: 52 de 53 pasan; la que falla es R5 |

Sin cambios en los demás puntos: el campo de año del escaneo (hallazgo 2) quedó anotado en el #266, donde además se decidió el rango por fechas con calendario (D-256). Sigue sin revisarse la pantalla con sesión.

<details>
<summary>Código de las pruebas de revisión (apartado 5)</summary>

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { analizarConsulta, opcionesAnioPublicacion } from "./consulta";

// Pruebas de la revisión independiente del PR #289 (no forman parte del PR).
afterEach(() => vi.useRealTimers());

describe("revisión PR #289", () => {
  it("R1 la lista empieza en el año dado, baja de uno en uno y termina en 1900", () => {
    const opciones = opcionesAnioPublicacion(2026).map((o) => o.valor);
    expect(opciones).toHaveLength(127);
    expect(opciones.slice(0, 3)).toEqual(["2026", "2025", "2024"]);
    expect(opciones.at(-1)).toBe("1900");
    expect(new Set(opciones).size).toBe(opciones.length);
  });

  it("R2 un año futuro en la URL da el mensaje en español y no se aplica como filtro", () => {
    const resultado = analizarConsulta({ anio: "2027", tipo: "ARTICULO" }, 2026);
    expect(resultado.success).toBe(false);
    expect(resultado.data.filtros.anio).toBe("");
    expect(resultado.data.filtros.tipo).toBe("ARTICULO");
    if (!resultado.success) expect(resultado.error.issues).toEqual([{ path: ["anio"], message: "Indica un año entre 1900 y 2026." }]);
  });

  it("R3 valores manipulados: anterior a 1900, texto, cinco dígitos y dos años", () => {
    for (const anio of ["1899", "abcd", "02025", " 2025"]) {
      const resultado = analizarConsulta({ anio }, 2026);
      expect(resultado.success, anio).toBe(false);
      if (!resultado.success) expect(resultado.error.issues[0].message).toBe("Indica un año entre 1900 y 2026.");
    }
    const doble = analizarConsulta({ anio: ["2025", "2024"] }, 2026);
    expect(doble.success).toBe(false);
    if (!doble.success) expect(doble.error.issues[0].message).toBe("Indica un solo año.");
  });

  it("R4 sin año en la URL no hay error ni filtro", () => {
    const resultado = analizarConsulta({}, 2026);
    expect(resultado.success).toBe(true);
    expect(resultado.data.filtros.anio).toBe("");
  });

  it("R5 el año por omisión se calcula en UTC: la noche del 31 de diciembre en Jalisco ya acepta el año siguiente (hallazgo 1)", () => {
    vi.useFakeTimers();
    // 31 de diciembre de 2026, 19:00 en America/Mexico_City (UTC-6) = 1 de enero de 2027, 01:00 UTC.
    vi.setSystemTime(new Date("2027-01-01T01:00:00Z"));
    expect(new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" })).toBe("31/12/2026");
    expect(analizarConsulta({ anio: "2027" }).success).toBe(true);
  });

  it("R6 con el año actual igual a 1900 hay una sola opción y nunca una lista negativa", () => {
    expect(opcionesAnioPublicacion(1900)).toEqual([{ valor: "1900", texto: "1900" }]);
    expect(opcionesAnioPublicacion(1899)).toEqual([]);
  });
});
```

</details>
