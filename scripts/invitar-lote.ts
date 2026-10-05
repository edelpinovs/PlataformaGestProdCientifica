// Da acceso por lotes a las personas de scripts/equipo.txt.
// Uso: npm run invitar:lote                      enlaces de invitación (caducan, sirven una vez)
//      npm run invitar:lote -- --contrasena      contraseñas temporales (no caducan)
//      npm run invitar:lote -- otra-lista.txt    usa otra lista
//
// Formato de la lista, una persona por línea:   correo  [ROL]  [# comentario]
// - El ROL es opcional (ADMINISTRADOR por defecto: es el entorno de desarrollo).
// - Las líneas que empiezan con # se ignoran: comenta a quien ya entró.
// La lista y los resultados tienen datos personales y están en .gitignore.
import { readFileSync, writeFileSync } from "node:fs";
import { asignarContrasenaTemporal, conectar, esRol, invitar } from "./lib/invitacion";

const ROL_POR_DEFECTO = "ADMINISTRADOR";
const SITIO = "https://plataforma-gest-prod-cientifica.vercel.app";

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
  const args = process.argv.slice(2);
  const conContrasena = args.includes("--contrasena");
  const ruta = args.find((a) => !a.startsWith("--")) ?? "scripts/equipo.txt";
  const personas = leerLista(ruta);
  if (personas.length === 0) {
    console.log(`No hay personas activas en ${ruta}: todas las líneas están comentadas.`);
    return;
  }

  const conexion = conectar();
  const bloques: string[] = [];
  const fallidos: string[] = [];
  try {
    for (const { correo, rol } of personas) {
      try {
        if (conContrasena) {
          const r = await asignarContrasenaTemporal(conexion, correo, rol);
          bloques.push(`${r.correo} · ${r.rol}\nContraseña temporal: ${r.contrasena}`);
        } else {
          const r = await invitar(conexion, correo, rol);
          const nota = r.tipo === "recuperacion" ? " · ya existía: enlace para restablecer contraseña" : "";
          bloques.push(`${r.correo} · ${r.rol}${nota}\n${r.enlace}`);
        }
        console.log(`✓ ${correo} · ${rol}`);
      } catch (error) {
        fallidos.push(correo);
        console.log(`✗ ${correo}: ${error instanceof Error ? error.message : error}`);
      }
    }
  } finally {
    await conexion.prisma.$disconnect();
  }

  if (bloques.length > 0) {
    const hora = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
    const marca = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const salida = `scripts/invitaciones-${conContrasena ? "contrasenas-" : ""}${marca}.txt`;
    const instrucciones = conContrasena
      ? [
          `Contraseñas temporales asignadas el ${hora} (hora de Ciudad de México).`,
          `Cada persona entra en ${SITIO} con su correo y su contraseña temporal,`,
          "y la cambia en «Cambiar contraseña» (junto a «Cerrar sesión»). Envía cada una solo a su dueño.",
        ]
      : [
          `Enlaces generados el ${hora} (hora de Ciudad de México).`,
          "Cada enlace sirve una sola vez y caduca en 1 hora. Envíalo solo a su dueño.",
        ];
    writeFileSync(salida, [...instrucciones, "", ...bloques.flatMap((b) => [b, ""])].join("\n"));
    console.log(`\n${bloques.length} resultado(s) guardados en ${salida}`);
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
