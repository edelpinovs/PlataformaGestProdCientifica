// Valida los CSV reales de profesores. SOLO LEE: no se conecta a la base ni escribe nada salvo el informe.
//   npm run importar:validar                 busca los archivos en datos-reales/
//   npm run importar:validar -- otra-carpeta
//
// La carpeta debe estar ignorada por git (el repositorio es público). Dentro se buscan:
//   un CSV cuyo nombre contenga «completo»  → listado de profesores
//   un CSV cuyo nombre contenga «scopus»    → autores de Scopus con departamento
// Escribe <carpeta>/informe-validacion.md CON nombres (para revisarlo con el cliente). En la terminal
// solo imprime conteos. Detalle en docs/IMPORTACION_DATOS_REALES.md.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { leerCsvReales } from "./lib/datos-reales";
import { informeDetallado, resumenAnonimo, validarProfesores } from "./lib/importar-profesores";

try {
  const { carpeta, completo, scopus } = leerCsvReales(process.argv[2]);
  const resultado = validarProfesores({ completo, scopus });

  const salida = path.join(carpeta, "informe-validacion.md");
  writeFileSync(salida, informeDetallado(resultado), "utf8");

  console.log(resumenAnonimo(resultado));
  console.log(`\nInforme con nombres: ${salida}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
