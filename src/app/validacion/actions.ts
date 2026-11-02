"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import type { EstadoFila } from "@/components/fila-editable";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { idDeFormulario } from "@/modules/catalogos/comun";
import {
  motivoNoEliminablePublicacion,
  normalizar,
  publicacionManualEsquema,
  revisarPublicacionManual,
} from "@/modules/validacion/manual";

export type EstadoManual = {
  error?: string;
  campo?: string;
  registrado?: string;
  valores?: Record<string, string>;
};

const NO_EXISTE = "Esa publicación ya no existe en el sistema. Recarga la página.";

// RF-023 · CU-012: Registro manual de publicaciones no detectadas por el escaneo automático.
export async function registrarPublicacionManual(
  _: EstadoManual,
  formData: FormData,
): Promise<EstadoManual> {
  const perfil = await requireModulo("validacion");

  let profesorIdFinal: number | undefined;

  if (perfil.rol === "DOCENTE") {
    if (!perfil.profesorId) {
      return {
        error: "Tu cuenta de usuario no está asociada a ningún perfil docente en el sistema.",
      };
    }
    profesorIdFinal = perfil.profesorId;
  } else {
    const rawId = formData.get("profesorId");
    profesorIdFinal = rawId ? Number(rawId) : (perfil.profesorId ?? undefined);
  }

  const valores: Record<string, string> = {
    tipo: String(formData.get("tipo") ?? ""),
    titulo: String(formData.get("titulo") ?? ""),
    autoresTexto: String(formData.get("autoresTexto") ?? ""),
    fechaPublicacion: String(formData.get("fechaPublicacion") ?? ""),
    revistaEditorial: String(formData.get("revistaEditorial") ?? ""),
    isbnIssn: String(formData.get("isbnIssn") ?? ""),
    doi: String(formData.get("doi") ?? ""),
    volumen: String(formData.get("volumen") ?? ""),
    paginas: String(formData.get("paginas") ?? ""),
    evidenciaUrl: String(formData.get("evidenciaUrl") ?? ""),
    profesorId: profesorIdFinal ? String(profesorIdFinal) : "",
  };

  const datos = publicacionManualEsquema.safeParse({
    ...valores,
    profesorId: profesorIdFinal,
  });

  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }

  const [profesores, publicacionesExistentes] = await Promise.all([
    prisma.profesor.findMany({ select: { id: true, nombres: true, apellidos: true } }),
    prisma.publicacion.findMany({
      select: {
        id: true,
        doi: true,
        tituloNormalizado: true,
        autorias: { select: { profesorId: true } },
      },
    }),
  ]);

  const problema = revisarPublicacionManual(datos.data, { profesores, publicacionesExistentes });
  if (problema) {
    return { error: problema.mensaje, campo: problema.campo, valores };
  }

  try {
    await prisma.publicacion.create({
      data: {
        tipo: datos.data.tipo,
        titulo: datos.data.titulo,
        tituloNormalizado: normalizar(datos.data.titulo),
        doi: datos.data.doi ?? null,
        autoresTexto: datos.data.autoresTexto,
        revistaEditorial: datos.data.revistaEditorial ?? null,
        isbnIssn: datos.data.isbnIssn ?? null,
        fechaPublicacion: datos.data.fechaPublicacion ? new Date(datos.data.fechaPublicacion) : null,
        volumen: datos.data.volumen ?? null,
        paginas: datos.data.paginas ?? null,
        evidenciaUrl: datos.data.evidenciaUrl ?? null,
        fuente: "MANUAL",
        autorias: {
          create: {
            profesorId: datos.data.profesorId,
            estado: "VALIDADA",
            revisadaEn: new Date(),
          },
        },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe una publicación con el mismo identificador DOI.", valores };
    }
    throw e;
  }

  revalidatePath("/validacion");
  return { registrado: datos.data.titulo };
}

// Edición de una publicación manual (regla #59 de AGENTS.md)
export async function editarPublicacionManual(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  const perfil = await requireModulo("validacion");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const publicacionActual = await prisma.publicacion.findUnique({
    where: { id },
    include: { autorias: true },
  });

  if (!publicacionActual) return { error: NO_EXISTE };
  if (publicacionActual.fuente !== "MANUAL") {
    return { error: "Solo se pueden editar metadatos de publicaciones de origen manual desde esta vista." };
  }

  // Si es docente, comprobar que sea su propia autoría
  if (perfil.rol === "DOCENTE" && (!perfil.profesorId || !publicacionActual.autorias.some((a) => a.profesorId === perfil.profesorId))) {
    return { error: "No tienes permiso para editar esta publicación." };
  }

  const profesorIdAsignado = publicacionActual.autorias[0]?.profesorId;
  if (!profesorIdAsignado) return { error: "La publicación no tiene profesor asignado." };

  const valores: Record<string, string> = {
    tipo: String(formData.get("tipo") ?? publicacionActual.tipo),
    titulo: String(formData.get("titulo") ?? publicacionActual.titulo),
    autoresTexto: String(formData.get("autoresTexto") ?? publicacionActual.autoresTexto),
    revistaEditorial: String(formData.get("revistaEditorial") ?? (publicacionActual.revistaEditorial ?? "")),
    isbnIssn: String(formData.get("isbnIssn") ?? (publicacionActual.isbnIssn ?? "")),
    doi: String(formData.get("doi") ?? (publicacionActual.doi ?? "")),
  };

  const datos = publicacionManualEsquema.safeParse({
    tipo: valores.tipo,
    titulo: valores.titulo,
    autoresTexto: valores.autoresTexto,
    revistaEditorial: valores.revistaEditorial || undefined,
    isbnIssn: valores.isbnIssn || undefined,
    doi: valores.doi || undefined,
    profesorId: profesorIdAsignado,
  });

  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }

  const [profesores, publicacionesExistentes] = await Promise.all([
    prisma.profesor.findMany({ select: { id: true, nombres: true, apellidos: true } }),
    prisma.publicacion.findMany({
      select: {
        id: true,
        doi: true,
        tituloNormalizado: true,
        autorias: { select: { profesorId: true } },
      },
    }),
  ]);

  const problema = revisarPublicacionManual(datos.data, { profesores, publicacionesExistentes }, id);
  if (problema) {
    return { error: problema.mensaje, campo: problema.campo, valores };
  }

  try {
    await prisma.publicacion.update({
      where: { id },
      data: {
        tipo: datos.data.tipo,
        titulo: datos.data.titulo,
        tituloNormalizado: normalizar(datos.data.titulo),
        doi: datos.data.doi ?? null,
        autoresTexto: datos.data.autoresTexto,
        revistaEditorial: datos.data.revistaEditorial ?? null,
        isbnIssn: datos.data.isbnIssn ?? null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { error: "Ya existe una publicación con ese DOI.", valores };
      if (e.code === "P2025") return { error: NO_EXISTE };
    }
    throw e;
  }

  revalidatePath("/validacion");
  redirect(`/validacion?editado=${encodeURIComponent(datos.data.titulo)}`, RedirectType.replace);
}

// Eliminación de una publicación manual (regla #59 de AGENTS.md)
export async function eliminarPublicacionManual(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  const perfil = await requireModulo("validacion");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const publicacion = await prisma.publicacion.findUnique({
    where: { id },
    include: { autorias: true },
  });

  if (!publicacion) return { error: NO_EXISTE };

  if (perfil.rol === "DOCENTE" && (!perfil.profesorId || !publicacion.autorias.some((a) => a.profesorId === perfil.profesorId))) {
    return { error: "No tienes permiso para eliminar esta publicación." };
  }

  const motivo = motivoNoEliminablePublicacion(
    publicacion.titulo,
    publicacion.autorias.length,
    publicacion.fuente === "MANUAL",
  );
  if (motivo) return { error: motivo };

  try {
    await prisma.publicacion.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { error: NO_EXISTE };
    }
    throw e;
  }

  revalidatePath("/validacion");
  redirect(`/validacion?eliminado=${encodeURIComponent(publicacion.titulo)}`, RedirectType.replace);
}
