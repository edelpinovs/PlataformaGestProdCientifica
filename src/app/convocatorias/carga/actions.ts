"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { after } from "next/server";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  BUCKET,
  cargaResultados,
  formatoDeArchivo,
  motivoNoEliminable,
  nombreDeRuta,
  puedeVolverALeer,
  registroCarga,
  rutaArchivo,
  TAMANO_MAXIMO,
  tipoMime,
} from "@/modules/convocatorias/carga";
import { procesarCarga } from "./procesamiento";

// RF-016 (CU-010) en tres pasos, porque Vercel no acepta más de 4.5 MB por petición:
// 1. prepararCarga valida los datos del archivo y entrega una URL firmada de Storage.
// 2. El navegador sube el archivo directo a Storage con esa URL.
// 3. registrarCarga comprueba el archivo subido, registra la carga y su tarea, y lanza la
//    lectura del archivo en segundo plano (RF-017).

export type EstadoCarga = { errors?: string[]; registrada?: string };

export type DatosArchivo = {
  programa: string;
  anio: string;
  nombreArchivo: string;
  tipo: string;
  tamano: number;
};

export type Preparacion =
  | { errors: string[] }
  | { ruta: string; token: string; tipo: string; programa: string; anio: number };

const ERROR_STORAGE = "No se pudo guardar el archivo. Inténtalo de nuevo en unos minutos.";

export async function prepararCarga(datos: DatosArchivo): Promise<Preparacion> {
  await requireModulo("convocatorias");

  const valido = cargaResultados(new Date().getFullYear()).safeParse(datos);
  if (!valido.success) return { errors: valido.error.issues.map((i) => i.message) };

  const { programa, anio, nombreArchivo, tipo } = valido.data;
  // formatoDeArchivo ya se comprobó en el esquema; aquí solo se lee.
  const formato = formatoDeArchivo(nombreArchivo, tipo)!;
  const ruta = rutaArchivo(programa, anio, nombreArchivo, new Date());

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(ruta);
  if (error || !data) return { errors: [ERROR_STORAGE] };

  return { ruta, token: data.token, tipo: tipoMime(formato), programa, anio };
}

export async function registrarCarga(datos: {
  programa: string;
  anio: number;
  ruta: string;
}): Promise<EstadoCarga> {
  const perfil = await requireModulo("convocatorias");

  const valido = registroCarga(new Date().getFullYear()).safeParse(datos);
  if (!valido.success) return { errors: valido.error.issues.map((i) => i.message) };
  const { programa, anio, ruta } = valido.data;
  const nombre = nombreDeRuta(ruta);

  // El archivo debe estar en Storage y respetar el límite (el bucket también lo impone).
  const supabase = await createClient();
  const { data: info, error } = await supabase.storage.from(BUCKET).info(ruta);
  if (error || !info) return { errors: ["No se encontró el archivo subido. Vuelve a cargarlo."] };
  if (!info.size || info.size > TAMANO_MAXIMO) {
    await supabase.storage.from(BUCKET).remove([ruta]);
    return { errors: ["El archivo está vacío o pesa más de 50 MB."] };
  }

  if (await prisma.cargaResultados.findFirst({ where: { archivoRuta: ruta }, select: { id: true } })) {
    return { errors: ["Este archivo ya está registrado."] };
  }

  let jobId: number;
  try {
    jobId = await prisma.$transaction(async (tx) => {
      const convocatoria = await tx.convocatoria.upsert({
        where: { programa_anio: { programa, anio } },
        update: {},
        create: { programa, anio },
      });
      const carga = await tx.cargaResultados.create({
        data: { convocatoriaId: convocatoria.id, archivoRuta: ruta, estado: "PROCESANDO", cargadaPor: perfil.id },
      });
      // RF-017 toma esta tarea para leer el archivo y cruzarlo con el directorio (RNF-001).
      const tarea = await tx.job.create({
        data: {
          tipo: "carga-resultados",
          total: 1,
          datos: { cargaId: carga.id, convocatoriaId: convocatoria.id, ruta, programa, anio },
        },
      });
      return tarea.id;
    });
  } catch {
    // Sin registro, el archivo quedaría huérfano en Storage.
    await supabase.storage.from(BUCKET).remove([ruta]);
    return { errors: ["No se pudo registrar la carga. Inténtalo de nuevo en unos minutos."] };
  }

  // La lectura sigue después de responder, con la sesión de quien subió el archivo (RF-017).
  after(() => procesarCarga(jobId, supabase));

  revalidatePath("/convocatorias");
  return { registrada: `${programa} ${anio} · ${nombre}` };
}

export type EstadoFila = { error?: string };

const NO_EXISTE = "Esa carga ya no existe. Recarga la página.";

// #59: elimina una carga que aún no se confirma, su tarea pendiente y su archivo.
export async function eliminarCarga(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("convocatorias");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: NO_EXISTE };

  const carga = await prisma.cargaResultados.findUnique({
    where: { id },
    select: { estado: true, archivoRuta: true, convocatoria: { select: { programa: true, anio: true } } },
  });
  if (!carga) return { error: NO_EXISTE };
  const nombre = nombreDeRuta(carga.archivoRuta);

  const tareas = { tipo: "carga-resultados", datos: { path: ["cargaId"], equals: id } };
  const tareaEnProceso = (await prisma.job.count({ where: { ...tareas, estado: "EN_PROCESO" } })) > 0;
  const motivo = motivoNoEliminable({ estado: carga.estado, nombre }, tareaEnProceso);
  if (motivo) return { error: motivo };

  // La condición va en el mismo DELETE: si la carga se confirma en este instante, no se borra.
  const borrada = await prisma.$transaction(async (tx) => {
    const { count } = await tx.cargaResultados.deleteMany({ where: { id, estado: { not: "CONFIRMADA" } } });
    if (count === 0) return false;
    await tx.job.deleteMany({ where: { ...tareas, estado: { not: "EN_PROCESO" } } });
    return true;
  });
  if (!borrada) {
    const actual = await prisma.cargaResultados.findUnique({ where: { id }, select: { estado: true } });
    return { error: actual ? (motivoNoEliminable({ estado: actual.estado, nombre }, false) ?? NO_EXISTE) : NO_EXISTE };
  }

  // Si Storage falla, la carga ya no existe y el archivo solo ocupa espacio; no se bloquea a la persona.
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([carga.archivoRuta]);

  revalidatePath("/convocatorias");
  const texto = `${carga.convocatoria.programa} ${carga.convocatoria.anio} · ${nombre}`;
  redirect(`/convocatorias?eliminado=${encodeURIComponent(texto)}`, RedirectType.replace);
}

// RF-017: vuelve a leer una carga fallida, o una cuya lectura se cortó (sin avance en 10 min).
export async function volverALeer(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("convocatorias");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: NO_EXISTE };

  const carga = await prisma.cargaResultados.findUnique({ where: { id }, select: { id: true, estado: true } });
  if (!carga) return { error: NO_EXISTE };
  if (carga.estado === "EN_REVISION") return { error: "Esta carga ya se leyó." };
  if (carga.estado === "CONFIRMADA") return { error: "Esta carga ya se confirmó." };

  const tareas = { tipo: "carga-resultados", datos: { path: ["cargaId"], equals: id } };
  const tarea = await prisma.job.findFirst({ where: tareas, orderBy: { id: "desc" }, select: { id: true, actualizadoEn: true } });
  if (!puedeVolverALeer(carga.estado, tarea?.actualizadoEn ?? null, new Date())) {
    return { error: "La carga se está leyendo. Espera unos minutos." };
  }

  const jobId = await prisma.$transaction(async (tx) => {
    await tx.cargaResultados.update({ where: { id }, data: { estado: "PROCESANDO" } });
    if (tarea) {
      await tx.job.update({ where: { id: tarea.id }, data: { estado: "PENDIENTE", error: null, avance: 0 } });
      return tarea.id;
    }
    const nueva = await tx.job.create({ data: { tipo: "carga-resultados", total: 1, datos: { cargaId: id } } });
    return nueva.id;
  });

  const supabase = await createClient();
  after(() => procesarCarga(jobId, supabase));

  revalidatePath("/convocatorias");
  redirect("/convocatorias", RedirectType.replace);
}
