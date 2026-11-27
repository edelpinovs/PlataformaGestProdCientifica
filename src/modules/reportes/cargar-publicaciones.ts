import { prisma } from "@/lib/prisma";
import { anioDePublicacion, type DatosResultado, type ObraResultado } from "./publicaciones";

// Una fila por profesor, con sus autorías. El corte de 10 y los filtros se
// aplican después, en consultarResultados. El año sale de la fecha, sin hora.
export async function cargarResultados() {
  const [profesores, departamentos] = await Promise.all([
    prisma.profesor.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        codigo: true,
        nombres: true,
        apellidos: true,
        estatusLaboral: true,
        departamento: { select: { id: true, nombre: true } },
        autorias: {
          select: {
            estado: true,
            publicacion: { select: { id: true, tipo: true, fuente: true, fechaPublicacion: true } },
          },
        },
      },
    }),
    prisma.departamento.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);

  const datos: DatosResultado[] = profesores.map((profesor) => ({
    id: profesor.id,
    codigo: profesor.codigo,
    nombres: profesor.nombres,
    apellidos: profesor.apellidos,
    estatusLaboral: profesor.estatusLaboral,
    departamento: profesor.departamento,
    obras: profesor.autorias.map((autoria): ObraResultado => ({
      publicacionId: autoria.publicacion.id,
      estado: autoria.estado,
      tipo: autoria.publicacion.tipo,
      fuente: autoria.publicacion.fuente,
      anio: anioDePublicacion(autoria.publicacion.fechaPublicacion),
    })),
  }));

  const anios = new Set<number>();
  let haySinAnio = false;
  for (const profesor of datos) {
    for (const obra of profesor.obras) {
      if (obra.anio === null) haySinAnio = true;
      else anios.add(obra.anio);
    }
  }

  return {
    profesores: datos,
    departamentos,
    catalogo: {
      departamentos: departamentos.map((fila) => fila.id),
      anios: [...anios].sort((a, b) => a - b),
      haySinAnio,
    },
  };
}
