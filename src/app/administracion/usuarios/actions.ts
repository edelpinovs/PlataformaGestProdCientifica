"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import type { EstadoFila } from "@/components/fila-editable";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { revalidarProfesorSeleccionado } from "@/lib/selectores/profesor";
import {
  buscarDuplicado,
  edicionUsuario,
  validarCambioRol,
  validarDesactivacion,
  type PerfilUsuario,
} from "@/modules/administracion/usuarios";

const BASE = "/administracion/usuarios";
const NO_EXISTE = "Ese usuario ya no existe. Recarga la página.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idDePerfil(formData: FormData) {
  const id = formData.get("id");
  return typeof id === "string" && UUID.test(id) ? id : null;
}

async function leerPerfiles(): Promise<PerfilUsuario[]> {
  return prisma.perfil.findMany({ select: { id: true, correo: true, rol: true, activo: true, profesorId: true } });
}

// #241: cambia el rol y el profesor vinculado. Nunca cambia el correo (es la identidad en Supabase Auth).
// «Debe quedar un administrador» se revisa antes de guardar; dos administradores que se degraden a la vez
// podrían saltarse la regla, pero es un caso que exige coincidir en el mismo instante.
export async function editarUsuario(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("administracion");

  const id = idDePerfil(formData);
  if (!id) return { error: NO_EXISTE };

  const valores = {
    rol: String(formData.get("rol") ?? ""),
    profesorId: String(formData.get("profesorId") ?? ""),
  };
  const datos = edicionUsuario.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }

  const perfiles = await leerPerfiles();
  const perfil = perfiles.find((p) => p.id === id);
  if (!perfil) return { error: NO_EXISTE };

  const rechazoRol = validarCambioRol(perfil, datos.data.rol, perfiles);
  if (rechazoRol) return { error: rechazoRol.mensaje, campo: rechazoRol.campo, valores };

  const profesorId = datos.data.profesorId ?? null;
  if (profesorId !== null) {
    const duplicado = buscarDuplicado({ profesorId }, perfiles, id);
    if (duplicado) return { error: duplicado.mensaje, campo: duplicado.campo, valores };

    // El servidor vuelve a comprobar con Prisma que el profesor existe y no tiene otro perfil.
    const elegible = await revalidarProfesorSeleccionado(String(profesorId), (idProfesor) =>
      prisma.profesor.findFirst({
        where: { id: idProfesor, OR: [{ perfil: { is: null } }, { perfil: { is: { id } } }] },
        select: { id: true, nombres: true, apellidos: true, codigo: true },
      }),
    );
    if (elegible.error) return { error: elegible.error, campo: "profesorId", valores };
  }

  try {
    await prisma.perfil.update({ where: { id }, data: { rol: datos.data.rol, profesorId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: otro administrador vinculó a ese profesor entre la consulta y el cambio.
      if (e.code === "P2002") return { error: "Ese profesor ya tiene un perfil de acceso.", campo: "profesorId", valores };
      if (e.code === "P2025") return { error: NO_EXISTE };
    }
    throw e;
  }

  revalidatePath(BASE);
  redirect(`${BASE}?editado=${encodeURIComponent(perfil.correo)}`, RedirectType.replace);
}

// #241: desactiva o reactiva el acceso. El perfil y sus registros se conservan; nadie se elimina.
export async function cambiarEstadoUsuario(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  const actor = await requireModulo("administracion");

  const id = idDePerfil(formData);
  if (!id) return { error: NO_EXISTE };

  const accion = formData.get("accion");
  if (accion !== "desactivar" && accion !== "reactivar") return { error: "La acción solicitada no es válida." };

  const perfiles = await leerPerfiles();
  const perfil = perfiles.find((p) => p.id === id);
  if (!perfil) return { error: NO_EXISTE };

  if (accion === "desactivar") {
    const rechazo = validarDesactivacion(perfil, perfiles, actor.id);
    if (rechazo) return { error: rechazo.mensaje };
  }

  try {
    await prisma.perfil.update({ where: { id }, data: { activo: accion === "reactivar" } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return { error: NO_EXISTE };
    throw e;
  }

  revalidatePath(BASE);
  const clave = accion === "reactivar" ? "reactivado" : "desactivado";
  redirect(`${BASE}?${clave}=${encodeURIComponent(perfil.correo)}`, RedirectType.replace);
}
