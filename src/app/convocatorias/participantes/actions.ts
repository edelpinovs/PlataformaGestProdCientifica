"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import type { EstadoAlta } from "@/components/modal-alta-logica";
import { Prisma } from "@/generated/prisma/client";
import { registrarAuditoria } from "@/lib/auditoria";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { revalidarProfesorSeleccionado } from "@/lib/selectores/profesor";
import { eventoAuditoria, resumenEliminacion } from "@/modules/administracion/auditoria";
import { motivoConvocatoriaConfirmada, participante } from "@/modules/convocatorias/participantes";

// RF-018: registro de quienes participaron en una convocatoria. El resultado se muestra como
// preliminar mientras la carga está en revisión y se guarda al confirmarla (RF-019); así el
// reporte de convocatoria anual (RF-028) solo cuenta resultados confirmados.

const RUTA = "/convocatorias/participantes";
const duplicado = (convocatoria: string) => `Ese profesor ya está registrado en ${convocatoria}.`;

export async function registrarParticipante(_: EstadoAlta, formData: FormData): Promise<EstadoAlta> {
  await requireModulo("convocatorias");

  const valores = {
    programa: String(formData.get("programa") ?? ""),
    anio: String(formData.get("anio") ?? ""),
    profesorId: String(formData.get("profesorId") ?? ""),
  };
  const datos = participante(new Date().getFullYear()).safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }
  const { programa, anio } = datos.data;
  const nombreConvocatoria = `${programa} ${anio}`;

  // Solo profesores activos: el selector los ofrece, pero el servidor vuelve a comprobarlo (D-215).
  const elegido = await revalidarProfesorSeleccionado(valores.profesorId, (id) =>
    prisma.profesor.findFirst({
      where: { id, estatusLaboral: "ACTIVO" },
      select: { id: true, nombres: true, apellidos: true, codigo: true },
    }),
  );
  if (!elegido.profesor) return { error: elegido.error, campo: "profesorId", valores };
  const profesor = elegido.profesor;

  const existente = await prisma.convocatoria.findUnique({
    where: { programa_anio: { programa, anio } },
    select: { id: true, cargas: { where: { estado: "CONFIRMADA" }, select: { id: true }, take: 1 } },
  });
  const confirmada = motivoConvocatoriaConfirmada(nombreConvocatoria, Boolean(existente?.cargas.length));
  if (confirmada) return { error: confirmada, valores };
  if (existente && await prisma.participacionConvocatoria.findUnique({
    where: { convocatoriaId_profesorId: { convocatoriaId: existente.id, profesorId: profesor.id } },
    select: { id: true },
  })) {
    return { error: duplicado(nombreConvocatoria), campo: "profesorId", valores };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const convocatoria = await tx.convocatoria.upsert({
        where: { programa_anio: { programa, anio } },
        update: {},
        create: { programa, anio },
      });
      await tx.participacionConvocatoria.create({
        data: { convocatoriaId: convocatoria.id, profesorId: profesor.id, origen: "MANUAL" },
      });
    });
  } catch (e) {
    // Otra persona lo registró entre la consulta y el alta; la base lo impide con @@unique.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: duplicado(nombreConvocatoria), campo: "profesorId", valores };
    }
    throw e;
  }

  revalidatePath(RUTA);
  return { exito: `Se registró a ${profesor.apellidos}, ${profesor.nombres} en ${nombreConvocatoria}.` };
}

export type EstadoFila = { error?: string };
const NO_EXISTE = "Ese participante ya no está registrado. Recarga la página.";

// #59: sin Editar; la participación solo tiene al profesor y el resultado lo pone la confirmación.
export async function eliminarParticipante(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  const perfil = await requireModulo("convocatorias");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) return { error: NO_EXISTE };

  const participacion = await prisma.participacionConvocatoria.findUnique({
    where: { id },
    select: {
      profesor: { select: { nombres: true, apellidos: true } },
      convocatoria: {
        select: { id: true, programa: true, anio: true, cargas: { where: { estado: "CONFIRMADA" }, select: { id: true }, take: 1 } },
      },
    },
  });
  if (!participacion) return { error: NO_EXISTE };
  const { convocatoria, profesor } = participacion;
  const nombreConvocatoria = `${convocatoria.programa} ${convocatoria.anio}`;

  const motivo = motivoConvocatoriaConfirmada(nombreConvocatoria, convocatoria.cargas.length > 0);
  if (motivo) return { error: motivo };

  // La condición va en el mismo DELETE: si la convocatoria se confirma en este instante, no se borra.
  // #380: el borrado y su constancia van juntos; si no se borró nada, no se registra.
  const count = await prisma.$transaction(async (tx) => {
    const borrado = await tx.participacionConvocatoria.deleteMany({
      where: { id, convocatoria: { cargas: { none: { estado: "CONFIRMADA" } } } },
    });
    if (borrado.count) {
      // Sin el nombre del profesor (D-294): solo el id de la participación y la convocatoria.
      const resumen = resumenEliminacion("la participación", `${id} de ${nombreConvocatoria}`);
      await registrarAuditoria(tx, eventoAuditoria("registro.eliminado", perfil, { tipo: "ParticipacionConvocatoria", id: String(id) }, resumen, "convocatorias"));
    }
    return borrado.count;
  });
  if (!count) {
    const sigue = await prisma.participacionConvocatoria.findUnique({ where: { id }, select: { id: true } });
    return { error: sigue ? motivoConvocatoriaConfirmada(nombreConvocatoria, true)! : NO_EXISTE };
  }

  revalidatePath(RUTA);
  const texto = `${profesor.apellidos}, ${profesor.nombres} (${nombreConvocatoria})`;
  redirect(`${RUTA}?eliminado=${encodeURIComponent(texto)}`, RedirectType.replace);
}
