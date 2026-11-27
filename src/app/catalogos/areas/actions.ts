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
import { area, buscarAreaDuplicada, motivoAreaNoEliminable } from "@/modules/catalogos/areas";
import { idDeFormulario } from "@/modules/catalogos/comun";

// Issue 264: el administrador registra un Área. D-214: se abre en un modal (`ModalAlta`), así que no
// redirige: solo un `exito` confirmado por el servidor cierra el modal y un error conserva los valores.
export async function registrarArea(_: EstadoAlta, formData: FormData): Promise<EstadoAlta> {
  await requireModulo("catalogos");

  const valores = { nombre: String(formData.get("nombre") ?? "") };
  const datos = area.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }

  const existentes = await prisma.area.findMany({ select: { nombre: true } });
  const duplicada = buscarAreaDuplicada(datos.data, existentes);
  if (duplicada) return { error: duplicada.mensaje, campo: duplicada.campo, valores };

  try {
    await prisma.area.create({ data: datos.data });
  } catch (e) {
    // Otro administrador la registró entre la consulta y el alta; la BD lo impide con @unique.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Esa área ya existe en el catálogo.", campo: "nombre", valores };
    }
    throw e;
  }

  revalidatePath("/catalogos/areas");
  revalidatePath("/catalogos/subareas");
  return { exito: `Se registró «${datos.data.nombre}» correctamente.` };
}

const NO_EXISTE = "Esa área ya no existe en el catálogo. Recarga la página.";

// #59: cambia el nombre con las mismas reglas del registro.
export async function editarArea(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("catalogos");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const valores = { nombre: String(formData.get("nombre") ?? "") };
  const datos = area.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }

  const catalogo = await prisma.area.findMany({ select: { id: true, nombre: true } });
  if (!catalogo.some((a) => a.id === id)) return { error: NO_EXISTE };
  const duplicada = buscarAreaDuplicada(datos.data, catalogo, id);
  if (duplicada) return { error: duplicada.mensaje, campo: duplicada.campo, valores };

  try {
    await prisma.area.update({ where: { id }, data: datos.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { error: "Esa área ya existe en el catálogo.", campo: "nombre", valores };
      if (e.code === "P2025") return { error: NO_EXISTE };
    }
    throw e;
  }

  revalidatePath("/catalogos/areas");
  revalidatePath("/catalogos/subareas");
  redirect(`/catalogos/areas?editada=${encodeURIComponent(datos.data.nombre)}`, RedirectType.replace);
}

// #59: elimina un área solo si no tiene subáreas.
export async function eliminarArea(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  const actor = await requireModulo("catalogos");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const actual = await prisma.area.findUnique({
    where: { id },
    select: { nombre: true, _count: { select: { subareas: true } } },
  });
  if (!actual) return { error: NO_EXISTE };

  const motivo = motivoAreaNoEliminable(actual.nombre, actual._count.subareas);
  if (motivo) return { error: motivo };

  // La condición va en el mismo DELETE; además la base lo impide (relación obligatoria, P2003).
  let borradas = 0;
  try {
    // El borrado y su constancia en la bitácora se guardan juntos o no se guarda ninguno (#277).
    borradas = await prisma.$transaction(async (tx) => {
      const { count } = await tx.area.deleteMany({ where: { id, subareas: { none: {} } } });
      if (count > 0) {
        await registrarAuditoria(tx, eventoAuditoria("registro.eliminado", actor, { tipo: "Area", id: String(id) },
          resumenEliminacion("el área", `«${actual.nombre}» (id ${id})`), "catalogos"));
      }
      return count;
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")) throw e;
  }
  if (borradas === 0) {
    const subareas = await prisma.subarea.count({ where: { areaId: id } });
    return { error: motivoAreaNoEliminable(actual.nombre, subareas) ?? NO_EXISTE };
  }

  revalidatePath("/catalogos/areas");
  revalidatePath("/catalogos/subareas");
  redirect(`/catalogos/areas?eliminada=${encodeURIComponent(actual.nombre)}`, RedirectType.replace);
}
