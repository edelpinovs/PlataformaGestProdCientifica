"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import type { EstadoFila } from "@/components/fila-editable";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { idDeFormulario } from "@/modules/catalogos/comun";
import { retornoValidacion } from "@/modules/validacion/listados";
import {
  edicionMetadatosBandejaEsquema,
  puedeGestionarAutoria,
  validarTransicionAutoria,
} from "@/modules/validacion/bandeja";
import {
  determinarEstadoInicialAutoria,
  motivoNoEliminablePublicacion,
  normalizar,
  normalizarDoi,
  publicacionManualEsquema,
  revisarPublicacionManual,
} from "@/modules/validacion/manual";

export type EstadoManual = {
  error?: string;
  campo?: string;
  registrado?: string;
  estadoAutoria?: "VALIDADA" | "PENDIENTE";
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
    if (!puedeGestionarAutoria(perfil, perfil.profesorId ?? 0)) {
      return {
        error: "Tu cuenta de usuario no está asociada a ningún perfil docente en el sistema.",
      };
    }
    profesorIdFinal = perfil.profesorId!;
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

  // Consulta puntual del profesor seleccionado
  const profesor = await prisma.profesor.findUnique({
    where: { id: datos.data.profesorId },
    select: { id: true, nombres: true, apellidos: true },
  });

  if (!profesor) {
    return {
      error: "El profesor seleccionado no existe en el directorio.",
      campo: "profesorId",
      valores,
    };
  }

  // Consulta puntual solo por DOI o por título normalizado del profesor (evita cargar toda la tabla)
  const tituloNorm = normalizar(datos.data.titulo);
  const doiNorm = datos.data.doi ? normalizarDoi(datos.data.doi) : null;

  const condicionesOr: Prisma.PublicacionWhereInput[] = [
    {
      tituloNormalizado: tituloNorm,
      autorias: { some: { profesorId: datos.data.profesorId } },
    },
  ];
  if (doiNorm) {
    condicionesOr.push({ doi: doiNorm });
  }

  const publicacionesExistentes = await prisma.publicacion.findMany({
    where: { OR: condicionesOr },
    select: {
      id: true,
      doi: true,
      tituloNormalizado: true,
      autorias: { select: { profesorId: true } },
    },
  });

  const problema = revisarPublicacionManual(datos.data, {
    profesores: [profesor],
    publicacionesExistentes,
  });
  if (problema) {
    return { error: problema.mensaje, campo: problema.campo, valores };
  }

  // RF-023 / Decisión de diseño:
  // Si el docente registra su obra, nace VALIDADA. Si un admin o coordinador captura
  // a nombre de un docente, nace PENDIENTE para que el profesor confirme en su bandeja (RF-024).
  const esDocenteAutor = perfil.rol === "DOCENTE" && perfil.profesorId === datos.data.profesorId;
  const { estado: estadoInicial, revisadaEn } = determinarEstadoInicialAutoria(esDocenteAutor);

  try {
    await prisma.publicacion.create({
      data: {
        tipo: datos.data.tipo,
        titulo: datos.data.titulo,
        tituloNormalizado: tituloNorm,
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
            estado: estadoInicial,
            revisadaEn,
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
  return { registrado: datos.data.titulo, estadoAutoria: estadoInicial };
}

// Edición de una publicación manual (regla #59 de AGENTS.md)
export async function editarPublicacionManual(retorno: string, _: EstadoFila, formData: FormData): Promise<EstadoFila> {
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

  // Verificación centralizada de permisos
  const autoriasIds = publicacionActual.autorias.map((a) => a.profesorId);
  if (!puedeGestionarAutoria(perfil, autoriasIds)) {
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

  const profesor = await prisma.profesor.findUnique({
    where: { id: profesorIdAsignado },
    select: { id: true, nombres: true, apellidos: true },
  });
  if (!profesor) return { error: "El profesor asignado ya no existe en el sistema." };

  // Consulta puntual de posibles conflictos excluyendo el registro propio
  const tituloNorm = normalizar(datos.data.titulo);
  const doiNorm = datos.data.doi ? normalizarDoi(datos.data.doi) : null;

  const condicionesOr: Prisma.PublicacionWhereInput[] = [
    {
      tituloNormalizado: tituloNorm,
      autorias: { some: { profesorId: profesorIdAsignado } },
    },
  ];
  if (doiNorm) {
    condicionesOr.push({ doi: doiNorm });
  }

  const publicacionesExistentes = await prisma.publicacion.findMany({
    where: {
      OR: condicionesOr,
      NOT: { id },
    },
    select: {
      id: true,
      doi: true,
      tituloNormalizado: true,
      autorias: { select: { profesorId: true } },
    },
  });

  const problema = revisarPublicacionManual(
    datos.data,
    { profesores: [profesor], publicacionesExistentes },
    id,
  );
  if (problema) {
    return { error: problema.mensaje, campo: problema.campo, valores };
  }

  try {
    await prisma.publicacion.update({
      where: { id },
      data: {
        tipo: datos.data.tipo,
        titulo: datos.data.titulo,
        tituloNormalizado: tituloNorm,
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
  redirect(retornoValidacion(retorno, "accion=editado"), RedirectType.replace);
}

// Eliminación de una publicación manual (regla #59 de AGENTS.md)
export async function eliminarPublicacionManual(retorno: string, _: EstadoFila, formData: FormData): Promise<EstadoFila> {
  const perfil = await requireModulo("validacion");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const publicacion = await prisma.publicacion.findUnique({
    where: { id },
    include: { autorias: true },
  });

  if (!publicacion) return { error: NO_EXISTE };

  const autoriasIds = publicacion.autorias.map((a) => a.profesorId);
  if (!puedeGestionarAutoria(perfil, autoriasIds)) {
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
  redirect(retornoValidacion(retorno, "accion=eliminado"), RedirectType.replace);
}

// RF-024 · RF-025 · CU-013: Confirmar autoría de una publicación detectada
export async function confirmarAutoria(formData: FormData): Promise<void> {
  const perfil = await requireModulo("validacion");
  const publicacionId = Number(formData.get("publicacionId"));
  const profesorId = Number(formData.get("profesorId"));

  if (!Number.isSafeInteger(publicacionId) || publicacionId <= 0 || !Number.isSafeInteger(profesorId) || profesorId <= 0) {
    redirect(retornoValidacion(formData.get("retorno"), "error=datos-invalidos"), RedirectType.replace);
  }

  if (!puedeGestionarAutoria(perfil, profesorId)) {
    redirect(retornoValidacion(formData.get("retorno"), "error=sin-permiso"), RedirectType.replace);
  }

  const autoria = await prisma.autoria.findUnique({
    where: { publicacionId_profesorId: { publicacionId, profesorId } },
  });

  if (!autoria) {
    redirect(retornoValidacion(formData.get("retorno"), "error=no-existe"), RedirectType.replace);
  }

  const transicion = validarTransicionAutoria(autoria.estado, "VALIDADA");
  if (!transicion.valida) {
    redirect(retornoValidacion(formData.get("retorno"), "error=transicion-invalida"), RedirectType.replace);
  }

  // RF-025: cambia a VALIDADA con fecha de revisión (incorpora al conteo oficial)
  await prisma.autoria.update({
    where: { publicacionId_profesorId: { publicacionId, profesorId } },
    data: {
      estado: "VALIDADA",
      revisadaEn: new Date(),
    },
  });

  revalidatePath("/validacion");
  redirect(retornoValidacion(formData.get("retorno"), "accion=confirmada"), RedirectType.replace);
}

// RF-024 · CU-013: Rechazar publicación por homónimo
export async function rechazarHomonimo(formData: FormData): Promise<void> {
  const perfil = await requireModulo("validacion");
  const publicacionId = Number(formData.get("publicacionId"));
  const profesorId = Number(formData.get("profesorId"));

  if (!Number.isSafeInteger(publicacionId) || publicacionId <= 0 || !Number.isSafeInteger(profesorId) || profesorId <= 0) {
    redirect(retornoValidacion(formData.get("retorno"), "error=datos-invalidos"), RedirectType.replace);
  }

  if (!puedeGestionarAutoria(perfil, profesorId)) {
    redirect(retornoValidacion(formData.get("retorno"), "error=sin-permiso"), RedirectType.replace);
  }

  const autoria = await prisma.autoria.findUnique({
    where: { publicacionId_profesorId: { publicacionId, profesorId } },
  });

  if (!autoria) {
    redirect(retornoValidacion(formData.get("retorno"), "error=no-existe"), RedirectType.replace);
  }

  const transicion = validarTransicionAutoria(autoria.estado, "RECHAZADA");
  if (!transicion.valida) {
    redirect(retornoValidacion(formData.get("retorno"), "error=transicion-invalida"), RedirectType.replace);
  }

  // Pasa a RECHAZADA (queda como registro de exclusión para futuros escaneos)
  await prisma.autoria.update({
    where: { publicacionId_profesorId: { publicacionId, profesorId } },
    data: {
      estado: "RECHAZADA",
      revisadaEn: new Date(),
    },
  });

  revalidatePath("/validacion");
  redirect(retornoValidacion(formData.get("retorno"), "accion=rechazada"), RedirectType.replace);
}

// RF-024 · CU-013: Editar metadatos de una publicación de la bandeja
export async function editarMetadatosBandeja(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  const perfil = await requireModulo("validacion");
  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const valores: Record<string, string> = {
    publicacionId: String(id),
    tipo: String(formData.get("tipo") ?? "ARTICULO"),
    titulo: String(formData.get("titulo") ?? ""),
    autoresTexto: String(formData.get("autoresTexto") ?? ""),
    revistaEditorial: String(formData.get("revistaEditorial") ?? ""),
    isbnIssn: String(formData.get("isbnIssn") ?? ""),
    doi: String(formData.get("doi") ?? ""),
  };

  const datos = edicionMetadatosBandejaEsquema.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }

  const publicacion = await prisma.publicacion.findUnique({
    where: { id },
    include: { autorias: true },
  });
  if (!publicacion) return { error: NO_EXISTE };

  const autoriasIds = publicacion.autorias.map((a) => a.profesorId);
  if (!puedeGestionarAutoria(perfil, autoriasIds)) {
    return { error: "No tienes permiso para editar esta publicación." };
  }

  const primerProfesorId = autoriasIds[0];
  if (!primerProfesorId) return { error: "La publicación no tiene autorías asociadas." };

  // Comprueba duplicados puntual por DOI o título de cualquiera de los autores asociados
  const tituloNorm = normalizar(datos.data.titulo);
  const doiNorm = datos.data.doi ? normalizarDoi(datos.data.doi) : null;

  const condicionesOr: Prisma.PublicacionWhereInput[] = [
    {
      tituloNormalizado: tituloNorm,
      autorias: { some: { profesorId: { in: autoriasIds } } },
    },
  ];
  if (doiNorm) {
    condicionesOr.push({ doi: doiNorm });
  }

  const publicacionesExistentes = await prisma.publicacion.findMany({
    where: {
      OR: condicionesOr,
      NOT: { id },
    },
    select: {
      id: true,
      doi: true,
      tituloNormalizado: true,
      autorias: { select: { profesorId: true } },
    },
  });

  const problema = revisarPublicacionManual(
    {
      tipo: datos.data.tipo,
      titulo: datos.data.titulo,
      autoresTexto: datos.data.autoresTexto,
      revistaEditorial: datos.data.revistaEditorial,
      isbnIssn: datos.data.isbnIssn,
      doi: datos.data.doi,
      profesorId: primerProfesorId,
    },
    {
      profesores: [{ id: primerProfesorId, nombres: "", apellidos: "" }],
      publicacionesExistentes,
    },
    id,
  );

  if (problema) {
    return { error: problema.mensaje, campo: problema.campo, valores };
  }

  try {
    await prisma.publicacion.update({
      where: { id },
      data: {
        tipo: datos.data.tipo,
        titulo: datos.data.titulo,
        tituloNormalizado: tituloNorm,
        autoresTexto: datos.data.autoresTexto,
        revistaEditorial: datos.data.revistaEditorial ?? null,
        isbnIssn: datos.data.isbnIssn ?? null,
        doi: datos.data.doi ?? null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { error: "Ya existe otra publicación con ese DOI.", valores };
      if (e.code === "P2025") return { error: NO_EXISTE };
    }
    throw e;
  }

  revalidatePath("/validacion");
  return {};
}
