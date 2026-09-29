// Invita por lotes a las personas de scripts/equipo.txt y guarda sus enlaces.
// Uso: npm run invitar:lote            (usa scripts/equipo.txt)
//      npm run invitar:lote -- otra-lista.txt
//
// Formato de la lista, una persona por línea:   correo  [ROL]  [# comentario]
// - El ROL es opcional (ADMINISTRADOR por defecto: es el entorno de desarrollo).
// - Las líneas que empiezan con # se ignoran: comenta a quien ya aceptó.
// La lista y los enlaces tienen datos personales y están en .gitignore.
import { readFileSync, writeFileSync } from "node:fs";
import { conectar, esRol, invitar, type ResultadoInvitacion } from "./lib/invitacion";

const ROL_POR_DEFECTO = "ADMINISTRADOR";

function leerLista(ruta: string) {
  return readFileSync(ruta, "utf-8")
    .split(/\r?\n/)
    .map((linea, i) => ({ linea: linea.replace(/#.*/, "").trim(), numero: i + 1 }))
    .filter(({ linea }) => linea)
    .map(({ linea, numero }) => {
      const [correo, rolTexto = ROL_POR_DEFECTO] = linea.split(/\s+/);
      const rol = rolTexto.toUpperCase();
      if (!correo.includes("@") || !esRol(rol)) {
        throw new Error(`Línea ${numero} inválida: "${linea}". Formato: correo [ADMINISTRADOR|COORDINADOR|DOCENTE]`);
      }
      return { correo: correo.toLowerCase(), rol };
    });
}

async function main() {
  const ruta = process.argv[2] ?? "scripts/equipo.txt";
  const personas = leerLista(ruta);
  if (personas.length === 0) {
    console.log(`No hay personas activas en ${ruta}: todas las líneas están comentadas.`);
    return;
  }

  const conexion = conectar();
  const enviados: ResultadoInvitacion[] = [];
  const fallidos: string[] = [];
  try {
    for (const { correo, rol } of personas) {
      try {
        enviados.push(await invitar(conexion, correo, rol));
        console.log(`✓ ${correo} · ${rol}`);
      } catch (error) {
        fallidos.push(correo);
        console.log(`✗ ${correo}: ${error instanceof Error ? error.message : error}`);
      }
    }
  } finally {
    await conexion.prisma.$disconnect();
  }

  if (enviados.length > 0) {
    const hora = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
    const salida = `scripts/invitaciones-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.txt`;
    const texto = [
      `Enlaces generados el ${hora} (hora de Ciudad de México).`,
      "Cada enlace sirve una sola vez y caduca en 1 hora. Envíalo solo a su dueño.",
      "",
      ...enviados.flatMap((r) => [
        `${r.correo} · ${r.rol}${r.tipo === "recuperacion" ? " · ya existía: enlace para restablecer contraseña" : ""}`,
        r.enlace,
        "",
      ]),
    ].join("\n");
    writeFileSync(salida, texto);
    console.log(`\n${enviados.length} enlace(s) guardados en ${salida}`);
  }
  if (fallidos.length > 0) {
    console.log(`${fallidos.length} con error: ${fallidos.join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
