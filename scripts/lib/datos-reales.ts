// Localiza y lee los CSV reales de profesores. Los comparten la validación y el cargador.
// Se niega a leer de una carpeta que git no ignore: el repositorio es público.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface CsvReales {
  carpeta: string;
  completo: string;
  scopus: string;
}

// Lanza un Error con un mensaje legible si la carpeta no sirve; quien llama lo imprime y termina.
export function leerCsvReales(carpetaArgumento?: string): CsvReales {
  const carpeta = path.resolve(carpetaArgumento ?? "datos-reales");

  if (!existsSync(carpeta)) {
    throw new Error(`No existe la carpeta ${carpeta}. Crea «datos-reales/» y copia ahí los CSV.`);
  }

  try {
    execFileSync("git", ["check-ignore", "-q", carpeta], { stdio: "ignore" });
  } catch {
    throw new Error(
      `La carpeta ${carpeta} NO está ignorada por git. El repositorio es público: agrégala a .gitignore antes de continuar.`,
    );
  }

  const csv = readdirSync(carpeta).filter((n) => n.toLowerCase().endsWith(".csv"));
  const buscar = (palabra: string) => csv.filter((n) => n.toLowerCase().includes(palabra));
  const completo = buscar("completo");
  const scopus = buscar("scopus");
  if (completo.length !== 1) {
    throw new Error(
      `Se esperaba un CSV con «completo» en el nombre y hay ${completo.length}. Archivos: ${csv.join(", ") || "(ninguno)"}.`,
    );
  }
  if (scopus.length > 1) throw new Error(`Hay ${scopus.length} CSV con «scopus» en el nombre; deja solo uno.`);

  return {
    carpeta,
    completo: readFileSync(path.join(carpeta, completo[0]), "utf8"),
    scopus: scopus.length === 1 ? readFileSync(path.join(carpeta, scopus[0]), "utf8") : "",
  };
}
