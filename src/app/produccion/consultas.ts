import { prisma } from "@/lib/prisma";
import { ETIQUETAS_FUENTE, ETIQUETAS_TIPO, filtroPublicaciones, ordenPublicaciones, paginarPublicaciones, tramosPorEtiqueta, type ConsultaPublicaciones } from "@/modules/produccion/consulta";

// La página exige requireModulo antes de invocar estas lecturas internas.
export async function consultarPublicaciones(consulta: ConsultaPublicaciones) {
  const where = filtroPublicaciones(consulta);
  // Un único snapshot mantiene coherentes el total, la página y las filas cuando
  // otro proceso está incorporando publicaciones durante la consulta.
  return prisma.$transaction(async (lectura) => {
    const total = await lectura.publicacion.count({ where });
    const paginacion = paginarPublicaciones(total, consulta);
    const opciones = {
      where, skip: paginacion.salto, take: paginacion.tamanio,
      orderBy: ordenPublicaciones(consulta),
      include: { autorias: { orderBy: { profesorId: "asc" }, include: {
        profesor: { select: { id: true, nombres: true, apellidos: true } },
      } } },
    } as const;
    // Las etiquetas visibles de tipo y fuente se ordenan alfabéticamente, no por
    // el orden de declaración del enum. Se leen como máximo diez obras en total.
    const publicaciones = [] as Awaited<ReturnType<typeof lectura.publicacion.findMany<typeof opciones>>>;
    if (consulta.orden === "tipo") {
      const grupos = await lectura.publicacion.groupBy({ by: ["tipo"], where, _count: { _all: true } });
      for (const tramo of tramosPorEtiqueta(grupos.map((grupo) => ({ valor: grupo.tipo, total: grupo._count._all })), ETIQUETAS_TIPO, consulta.dir, paginacion.salto, paginacion.tamanio)) {
        const tipo = grupos.find((grupo) => grupo.tipo === tramo.valor)!.tipo;
        publicaciones.push(...await lectura.publicacion.findMany({ ...opciones, where: { ...where, tipo }, skip: tramo.salto, take: tramo.cantidad }));
      }
    } else if (consulta.orden === "fuente") {
      const grupos = await lectura.publicacion.groupBy({ by: ["fuente"], where, _count: { _all: true } });
      for (const tramo of tramosPorEtiqueta(grupos.map((grupo) => ({ valor: grupo.fuente, total: grupo._count._all })), ETIQUETAS_FUENTE, consulta.dir, paginacion.salto, paginacion.tamanio)) {
        const fuente = grupos.find((grupo) => grupo.fuente === tramo.valor)!.fuente;
        publicaciones.push(...await lectura.publicacion.findMany({ ...opciones, where: { ...where, fuente }, skip: tramo.salto, take: tramo.cantidad }));
      }
    } else publicaciones.push(...await lectura.publicacion.findMany(opciones));
    return { publicaciones, ...paginacion };
  }, { isolationLevel: "RepeatableRead" });
}
