// Invita a una persona e imprime su enlace, sin enviar correo.
// Uso: npm run invitar -- persona@alumnos.udg.mx COORDINADOR
// Para varias personas a la vez, ver scripts/invitar-lote.ts.
import { ROLES } from "../src/lib/auth/roles";
import { conectar, esRol, invitar } from "./lib/invitacion";

async function main() {
  const [correoArg, rolArg = "DOCENTE"] = process.argv.slice(2);
  const correo = correoArg?.toLowerCase();
  const rol = rolArg.toUpperCase();
  if (!correo?.includes("@") || !esRol(rol)) {
    throw new Error(`Uso: npm run invitar -- <correo> [${ROLES.join("|")}]`);
  }

  const conexion = conectar();
  try {
    const r = await invitar(conexion, correo, rol);
    console.log(`${r.correo} · ${r.rol}`);
    console.log(r.tipo === "invitacion" ? "Enlace de invitación:" : "Ya existía. Enlace para restablecer su contraseña:");
    console.log(r.enlace);
  } finally {
    await conexion.prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
