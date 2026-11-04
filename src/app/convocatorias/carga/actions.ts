"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { cargaResultados, rutaArchivo } from "@/modules/convocatorias/carga";
import { requireModulo } from "@/lib/auth/session";

export type EstadoCarga = { ok?: boolean; errors?: string[]; ruta?: string };

const BUCKET = "resultados-convocatorias";

export async function subirResultados(
  _estadoPrevio: EstadoCarga,
  formData: FormData,
): Promise<EstadoCarga> {
  const perfil = await requireModulo("convocatorias");

  const archivo = formData.get("archivo") as File | null;
  const programa = String(formData.get("programa") ?? "");
  const anio = String(formData.get("anio") ?? "");
  const nombreArchivo = archivo ? archivo.name : String(formData.get("nombreArchivo") ?? "");
  const tipo = archivo ? archivo.type : String(formData.get("tipo") ?? "");
  const tamano = archivo ? archivo.size : Number(formData.get("tamano") ?? 0);

  const esquema = cargaResultados(new Date().getFullYear());
  const valido = esquema.safeParse({ programa, anio, nombreArchivo, tipo, tamano });
  if (!valido.success) {
    return { ok: false, errors: valido.error.issues.map((i) => i.message) };
  }

  const datos = valido.data;
  const fecha = new Date();
  const ruta = rutaArchivo(datos.programa, datos.anio, datos.nombreArchivo, fecha);

  if (!archivo) {
    return { ok: false, errors: ["No se recibió el archivo."] };
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    !process.env.DATABASE_URL
  ) {
    return {
      ok: false,
      errors: ["Faltan credenciales de entorno para subir; pide el .env al líder técnico."],
    };
  }

  const supabase = await createClient();
  const buffer = await archivo.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, new Uint8Array(buffer), { contentType: archivo.type });

  if (uploadError) {
    return {
      ok: false,
      errors: [`No se pudo almacenar el archivo en Storage: ${uploadError.message}`],
    };
  }

  try {
    const convocatoria = await prisma.convocatoria.upsert({
      where: {
        programa_anio: {
          programa: datos.programa,
          anio: datos.anio,
        },
      },
      update: {},
      create: {
        programa: datos.programa,
        anio: datos.anio,
      },
    });

    const carga = await prisma.cargaResultados.create({
      data: {
        convocatoriaId: convocatoria.id,
        archivoRuta: ruta,
        estado: "PROCESANDO",
        cargadaPor: perfil.id,
      },
    });

    await prisma.job.create({
      data: {
        tipo: "carga-resultados",
        estado: "PENDIENTE",
        avance: 0,
        total: 1,
        datos: {
          cargaId: carga.id,
          convocatoriaId: convocatoria.id,
          ruta,
          nombre: datos.nombreArchivo,
          programa: datos.programa,
          anio: datos.anio,
        },
      },
    });
  } catch (error) {
    return {
      ok: false,
      errors: [
        `El archivo se subió a Storage pero ocurrió un error registrando la carga: ${error instanceof Error ? error.message : "Error de base de datos"}`,
      ],
    };
  }

  revalidatePath("/convocatorias");
  return { ok: true, ruta };
}

