import { prisma } from "@/lib/prisma";
import { filtroPublicaciones, paginarPublicaciones, type ConsultaPublicaciones } from "@/modules/produccion/consulta";

// La página exige requireModulo antes de invocar estas lecturas internas.
export async function consultarPublicaciones(consulta: ConsultaPublicaciones) {
  const where = filtroPublicaciones(consulta);
  // Un único snapshot mantiene coherentes el total, la página y las filas cuando
  // otro proceso está incorporando publicaciones durante la consulta.
  return prisma.$transaction(async (lectura) => {
    const total = await lectura.publicacion.count({ where });
    const paginacion = paginarPublicaciones(total, consulta);
    const publicaciones = await lectura.publicacion.findMany({
      where, skip: paginacion.salto, take: paginacion.tamanio,
      orderBy: [{ creadaEn: "desc" }, { id: "desc" }],
      include: { autorias: { orderBy: { profesorId: "asc" }, include: {
        profesor: { select: { id: true, nombres: true, apellidos: true } },
      } } },
    });
    return { total, publicaciones, ...paginacion };
  }, { isolationLevel: "RepeatableRead" });
}
