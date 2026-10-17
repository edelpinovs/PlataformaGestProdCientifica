import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Hace cumplir la pauta visual (docs/diseno/PAUTA_VISUAL.md) en todo el código de interfaz.
// Si esta prueba falla, no la desactives: usa los colores con nombre de globals.css
// (bg-marca, text-texto-3, border-linea…) y las piezas de src/components/ui.tsx.

const SRC = path.resolve(__dirname, "..");

function archivosTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return entrada.name === "generated" ? [] : archivosTsx(ruta);
    return entrada.name.endsWith(".tsx") ? [ruta] : [];
  });
}

const PALETA_TAILWIND =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";
const UTILIDAD = "bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|shadow|accent|caret";

const REGLAS: { nombre: string; patron: RegExp; arreglo: string }[] = [
  {
    nombre: "color hexadecimal",
    patron: /#[0-9a-fA-F]{3,8}\b/,
    arreglo: "usa un color con nombre (bg-marca, text-texto-2…) o var(--marca) en style",
  },
  {
    nombre: "color de la paleta de Tailwind",
    patron: new RegExp(`\\b(?:${UTILIDAD})-(?:(?:${PALETA_TAILWIND})-\\d{2,3}|white|black)\\b`),
    arreglo: "usa los colores de la pauta: marca, texto, texto-2, texto-3, superficie, linea, exito, aviso, peligro…",
  },
  {
    nombre: "color con dark:",
    patron: new RegExp(`\\bdark:(?:${UTILIDAD})-`),
    arreglo: "los colores con nombre ya cambian solos en el tema oscuro; quita la clase dark:",
  },
  {
    nombre: "color rgb()/hsl()",
    patron: /\b(?:rgba?|hsla?)\(/,
    arreglo: "define el color en src/app/globals.css y úsalo por su nombre",
  },
];

const archivos = archivosTsx(SRC);

describe("pauta visual", () => {
  it("encuentra los archivos de interfaz", () => {
    expect(archivos.length).toBeGreaterThan(10);
  });

  for (const regla of REGLAS) {
    it(`no usa ${regla.nombre} en componentes`, () => {
      const hallazgos = archivos.flatMap((archivo) =>
        readFileSync(archivo, "utf-8")
          .split("\n")
          .flatMap((linea, i) =>
            regla.patron.test(linea) ? [`${path.relative(SRC, archivo)}:${i + 1}  ${linea.trim()}`] : [],
          ),
      );
      expect(hallazgos, `${regla.nombre}: ${regla.arreglo}`).toEqual([]);
    });
  }

  it("toda página con sesión usa el marco común", () => {
    // Las pantallas de acceso no tienen menú y usan PantallaAcceso.
    const sinMarco = archivos
      .filter((a) => a.endsWith(`${path.sep}page.tsx`))
      .filter((a) => {
        const codigo = readFileSync(a, "utf-8");
        const conSesion = /requireModulo|requireRol|getPerfil/.test(codigo);
        const usaMarco = /@\/components\/(marco|modulo-pendiente|panel-inicio)"/.test(codigo);
        return conSesion && !usaMarco;
      })
      .map((a) => path.relative(SRC, a));
    expect(sinMarco, "envuelve la página en <Marco> de @/components/marco").toEqual([]);
  });
});
