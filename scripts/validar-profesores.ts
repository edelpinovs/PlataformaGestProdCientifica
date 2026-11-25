// Valida los CSV reales de profesores. SOLO LEE: no se conecta a la base ni escribe nada salvo el informe.
//   npm run importar:validar                 busca los archivos en datos-reales/
//   npm run importar:validar -- otra-carpeta
//
// La carpeta debe estar ignorada por git (el repositorio es público). Dentro se buscan:
//   un CSV cuyo nombre contenga «completo»  → listado de profesores
//   un CSV cuyo nombre contenga «scopus»    → autores de Scopus con departamento
// Escribe <carpeta>/informe-validacion.md CON nombres (para revisarlo con el cliente). En la terminal
// solo imprime conteos. Detalle en docs/IMPORTACION_DATOS_REALES.md.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { informeDetallado, resumenAnonimo, validarProfesores } from "./lib/importar-profesores";

const carpeta = path.resolve(process.argv[2] ?? "datos-reales");

if (!existsSync(carpeta)) {
  console.error(`No existe la carpeta ${carpeta}. Crea «datos-reales/» y copia ahí los CSV.`);
  process.exit(1);
}

try {
  execFileSync("git", ["check-ignore", "-q", carpeta], { stdio: "ignore" });
} catch {
  console.error(`La carpeta ${carpeta} NO está ignorada por git. El repositorio es público: agrégala a .gitignore antes de continuar.`);
  process.exit(1);
}

const csv = readdirSync(carpeta).filter((n) => n.toLowerCase().endsWith(".csv"));
const buscar = (palabra: string) => csv.filter((n) => n.toLowerCase().includes(palabra));
const completo = buscar("completo");
const scopus = buscar("scopus");
if (completo.length !== 1) {
  console.error(`Se esperaba un CSV con «completo» en el nombre y hay ${completo.length}. Archivos: ${csv.join(", ") || "(ninguno)"}.`);
  process.exit(1);
}
if (scopus.length > 1) {
  console.error(`Hay ${scopus.length} CSV con «scopus» en el nombre; deja solo uno.`);
  process.exit(1);
}

const resultado = validarProfesores({
  completo: readFileSync(path.join(carpeta, completo[0]), "utf8"),
  scopus: scopus.length === 1 ? readFileSync(path.join(carpeta, scopus[0]), "utf8") : "",
});

const salida = path.join(carpeta, "informe-validacion.md");
writeFileSync(salida, informeDetallado(resultado), "utf8");

console.log(resumenAnonimo(resultado));
console.log(`\nInforme con nombres: ${salida}`);
