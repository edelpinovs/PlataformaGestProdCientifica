"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import type { EstadoFila } from "@/components/fila-editable";
import type { EstadoAlta } from "@/components/modal-alta-logica";
import { Prisma } from "@/generated/prisma/client";
import { registrarAuditoria } from "@/lib/auditoria";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { eventoAuditoria, resumenEliminacion } from "@/modules/administracion/auditoria";
import { idDeFormulario } from "@/modules/catalogos/comun";
import { revisarSubarea, subarea } from "@/modules/catalogos/subareas";

const YA_EXISTE = "Esa subárea ya existe en el área elegida.";
const AREA_INEXISTENTE = "El área elegida ya no existe. Recarga la página.";

// Issue 264: el administrador registra una Subárea dentro de un Área existente. D-214: se abre en un
// modal (`ModalAlta`), así que no redirige: solo un `exito` confirmado por el servidor cierra el modal.
export async function registrarSubarea(_: EstadoAlta, formData: FormData): Promise<EstadoAlta> {
  await requireModulo("catalogos");

  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    areaId: String(formData.get("areaId") ?? ""),
  };
  const datos = subarea.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }

  const [areas, subareas] = await Promise.all([
    prisma.area.findMany({ select: { id: true, nombre: true } }),
    prisma.subarea.findMany({ select: { nombre: true, areaId: true } }),
  ]);
  const problema = revisarSubarea(datos.data, { areas, subareas });
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  try {
    await prisma.subarea.create({ data: datos.data });
  } catch (e) {
    // Cambios simultáneos de otro administrador: la BD impide la subárea repetida dentro del área
    // (@@unique, P2002) y el área inexistente (llave foránea, P2003).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: YA_EXISTE, campo: "nombre", valores };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return { error: AREA_INEXISTENTE, campo: "areaId", valores };
    }
    throw e;
  }

  revalidatePath("/catalogos/subareas");
  revalidatePath("/catalogos/areas");
  return { exito: `Se registró «${datos.data.nombre}» correctamente.` };
}

const NO_EXISTE = "Esa subárea ya no existe en el catálogo. Recarga la página.";

// #59: cambia el área y el nombre con las mismas reglas del registro.
export async function editarSubarea(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("catalogos");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    areaId: String(formData.get("areaId") ?? ""),
  };
  const datos = subarea.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }

  const [areas, subareas] = await Promise.all([
    prisma.area.findMany({ select: { id: true, nombre: true } }),
    prisma.subarea.findMany({ select: { id: true, nombre: true, areaId: true } }),
  ]);
  if (!subareas.some((s) => s.id === id)) return { error: NO_EXISTE };
  const problema = revisarSubarea(datos.data, { areas, subareas }, id);
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  try {
    await prisma.subarea.update({ where: { id }, data: datos.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { error: YA_EXISTE, campo: "nombre", valores };
      if (e.code === "P2003") return { error: AREA_INEXISTENTE, campo: "areaId", valores };
      if (e.code === "P2025") return { error: NO_EXISTE };
    }
    throw e;
  }

  revalidatePath("/catalogos/subareas");
  revalidatePath("/catalogos/areas");
  redirect(`/catalogos/subareas?editada=${encodeURIComponent(datos.data.nombre)}`, RedirectType.replace);
}

// #59: elimina una subárea. Por ahora nada apunta a ella (el enlace con otras entidades se acuerda
// aparte), así que siempre se puede; cuando algo la use, aquí se revisa antes de borrar.
export async function eliminarSubarea(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  const actor = await requireModulo("catalogos");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const actual = await prisma.subarea.findUnique({ where: { id }, select: { nombre: true } });
  if (!actual) return { error: NO_EXISTE };

  // El borrado y su constancia en la bitácora se guardan juntos o no se guarda ninguno (#277).
  const borradas = await prisma.$transaction(async (tx) => {
    const { count } = await tx.subarea.deleteMany({ where: { id } });
    if (count > 0) {
      await registrarAuditoria(tx, eventoAuditoria("registro.eliminado", actor, { tipo: "Subarea", id: String(id) },
        resumenEliminacion("la subárea", `«${actual.nombre}» (id ${id})`), "catalogos"));
    }
    return count;
  });
  if (borradas === 0) return { error: NO_EXISTE };

  revalidatePath("/catalogos/subareas");
  revalidatePath("/catalogos/areas");
  redirect(`/catalogos/subareas?eliminada=${encodeURIComponent(actual.nombre)}`, RedirectType.replace);
}
