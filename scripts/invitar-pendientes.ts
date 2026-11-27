// Ejecuta las invitaciones que el panel de administración dejó pendientes (#275, D-301).
// Uso: npm run invitar:pendientes
//
// Por cada invitación: crea la cuenta en Supabase Auth (o la encuentra), le asigna el rol, vincula al
// profesor si lo hay, imprime su enlace SIN enviar correo y borra la invitación. Si una falla, queda
// pendiente y se informa el motivo. El enlace es de un solo uso y caduca: entrégalo por un medio
// privado y no lo guardes en el repositorio. Esta es la única pieza que usa SUPABASE_SECRET_KEY.
import { conectar, invitar } from "./lib/invitacion";

async function main() {
  const conexion = conectar();
  let hechas = 0;
  const fallidas: string[] = [];
  try {
    const pendientes = await conexion.prisma.invitacionPendiente.findMany({ orderBy: { id: "asc" } });
    if (pendientes.length === 0) {
      console.log("No hay invitaciones pendientes.");
      return;
    }

    for (const p of pendientes) {
      try {
        const r = await invitar(conexion, p.correo, p.rol, p.profesorId);
        await conexion.prisma.invitacionPendiente.delete({ where: { id: p.id } });
        hechas++;
        console.log(`\n✓ ${r.correo} · ${r.rol}`);
        console.log(r.tipo === "invitacion" ? "Enlace de invitación:" : "Ya existía. Enlace para restablecer su contraseña:");
        console.log(r.enlace);
      } catch (error) {
        fallidas.push(p.correo);
        console.log(`\n✗ ${p.correo}: ${error instanceof Error ? error.message : error} (sigue pendiente)`);
      }
    }
  } finally {
    await conexion.prisma.$disconnect();
  }
  console.log(`\nListas: ${hechas}. Con error: ${fallidas.length}.`);
  if (fallidas.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
