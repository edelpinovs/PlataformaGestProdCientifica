// Datos semilla FICTICIOS para desarrollo. Nunca cargar aquí datos reales de profesores.
// Uso: npx prisma db seed   (Integrante 4 lo amplía con ≈60 profesores de ejemplo)
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});

const GRADOS = [
  { nombre: "Licenciatura", nomenclatura: "LIC" },
  { nombre: "Maestría", nomenclatura: "MTRO" },
  { nombre: "Doctorado", nomenclatura: "DR" },
];

// 3 divisiones con 2 departamentos cada una (CU-002 y CU-003).
const DIVISIONES = [
  { clave: "DIV-A", nombre: "División de Ejemplo A", departamentos: ["DEP-A1", "DEP-A2"] },
  { clave: "DIV-B", nombre: "División de Ejemplo B", departamentos: ["DEP-B1", "DEP-B2"] },
  { clave: "DIV-C", nombre: "División de Ejemplo C", departamentos: ["DEP-C1", "DEP-C2"] },
];

async function main() {
  for (const grado of GRADOS) {
    await prisma.gradoCientifico.upsert({ where: { nombre: grado.nombre }, update: {}, create: grado });
  }

  for (const { departamentos, ...division } of DIVISIONES) {
    const { id } = await prisma.division.upsert({
      where: { clave: division.clave },
      update: {},
      create: division,
    });
    for (const nomenclatura of departamentos) {
      await prisma.departamento.upsert({
        where: { nomenclatura },
        update: {},
        create: { nomenclatura, nombre: `Departamento ${nomenclatura}`, divisionId: id },
      });
    }
  }
}

main()
  .then(() => console.log("Datos semilla cargados."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
