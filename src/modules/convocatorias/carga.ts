import { z } from "zod";

// RF-016 (CU-010): la Coordinación carga el archivo oficial de resultados de una
// convocatoria SNII o PRODEP. Aquí solo se valida y se ubica el archivo; leer su
// contenido es RF-017.

// Los listados oficiales en PDF pueden tener cientos de páginas. 50 MB es el
// máximo por archivo del plan gratuito de Supabase Storage.
export const TAMANO_MAXIMO_MB = 50;
export const TAMANO_MAXIMO = TAMANO_MAXIMO_MB * 1024 * 1024;

export const PRIMER_ANIO = 2000;

export const FORMATOS = {
  pdf: ["application/pdf"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
} as const;

export type Formato = keyof typeof FORMATOS;

export const PROGRAMAS = ["SNII", "PRODEP"] as const;
export type Programa = (typeof PROGRAMAS)[number];

export function extension(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto < 0 ? "" : nombre.slice(punto + 1).toLowerCase();
}

// Algunos navegadores no informan el tipo MIME (llega vacío o genérico);
// en ese caso manda la extensión.
export function formatoDeArchivo(nombre: string, tipo: string): Formato | null {
  const ext = extension(nombre);
  if (ext !== "pdf" && ext !== "xlsx") return null;
  const tipoLimpio = tipo.trim().toLowerCase();
  if (tipoLimpio === "" || tipoLimpio === "application/octet-stream") return ext;
  return (FORMATOS[ext] as readonly string[]).includes(tipoLimpio) ? ext : null;
}

// El año se recibe como parámetro para que la regla sea pura y se pueda probar.
export function cargaResultados(anioActual: number) {
  return z
    .object({
      programa: z.enum(PROGRAMAS, { error: "Elige si la convocatoria es SNII o PRODEP." }),
      anio: z.coerce
        .number({ error: "Escribe el año de la convocatoria." })
        .int("El año debe ser un número entero.")
        .min(PRIMER_ANIO, `El año debe ser ${PRIMER_ANIO} o posterior.`)
        .max(anioActual + 1, `El año no puede ser posterior a ${anioActual + 1}.`),
      nombreArchivo: z.string().trim().min(1, "Elige el archivo de resultados."),
      tipo: z.string(),
      tamano: z
        .number()
        .positive("El archivo está vacío.")
        .max(TAMANO_MAXIMO, `El archivo pesa más de ${TAMANO_MAXIMO_MB} MB.`),
    })
    .superRefine((datos, ctx) => {
      if (!formatoDeArchivo(datos.nombreArchivo, datos.tipo)) {
        ctx.addIssue({
          code: "custom",
          path: ["nombreArchivo"],
          message: "El archivo debe ser PDF (.pdf) o Excel (.xlsx).",
        });
      }
    });
}

export type CargaResultados = z.infer<ReturnType<typeof cargaResultados>>;

// Nombre seguro para Storage: sin acentos, espacios ni símbolos, conservando la extensión.
export function nombreSeguro(nombre: string): string {
  const ext = extension(nombre);
  const base = (ext ? nombre.slice(0, -(ext.length + 1)) : nombre)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "resultados"}${ext ? `.${ext}` : ""}`;
}

// Ruta dentro del bucket: <programa>/<año>/<marca de tiempo>-<nombre>.
// La marca de tiempo evita que una segunda carga pise a la primera.
export function rutaArchivo(programa: Programa, anio: number, nombre: string, fecha: Date): string {
  const marca = fecha.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
  return `${programa.toLowerCase()}/${anio}/${marca}-${nombreSeguro(nombre)}`;
}

// Bucket privado de Supabase Storage (migración bucket_resultados_convocatorias).
export const BUCKET = "resultados-convocatorias";

// Tipo con que se guarda el archivo: se decide por el formato validado, no por lo
// que informe el navegador, para que Storage lo acepte siempre igual.
export function tipoMime(formato: Formato): string {
  return FORMATOS[formato][0];
}

// La ruta llega del navegador al registrar la carga, después de subir el archivo.
// Solo se acepta una ruta con la forma que genera rutaArchivo para ese programa y año,
// así nadie registra un archivo de otra carpeta ni de otra convocatoria.
export function rutaValida(ruta: string, programa: Programa, anio: number): boolean {
  const patron = new RegExp(`^${programa.toLowerCase()}/${anio}/\\d{8}T\\d{6}-[a-z0-9-]+\\.(pdf|xlsx)$`);
  return patron.test(ruta);
}

export function registroCarga(anioActual: number) {
  return z
    .object({
      programa: z.enum(PROGRAMAS, { error: "Elige si la convocatoria es SNII o PRODEP." }),
      anio: z.coerce
        .number({ error: "Escribe el año de la convocatoria." })
        .int("El año debe ser un número entero.")
        .min(PRIMER_ANIO, `El año debe ser ${PRIMER_ANIO} o posterior.`)
        .max(anioActual + 1, `El año no puede ser posterior a ${anioActual + 1}.`),
      ruta: z.string().trim(),
    })
    .refine((d) => rutaValida(d.ruta, d.programa, d.anio), {
      path: ["ruta"],
      message: "No se reconoce el archivo subido. Vuelve a cargarlo.",
    });
}

// Nombre legible del archivo a partir de su ruta, sin la marca de tiempo.
export function nombreDeRuta(ruta: string): string {
  const archivo = ruta.split("/").pop() ?? ruta;
  return archivo.replace(/^\d{8}T\d{6}-/, "");
}

// #59: una carga se puede eliminar mientras no se haya confirmado (RF-019) ni se esté leyendo (RF-017).
// Una carga confirmada ya actualizó los reconocimientos de los profesores: es el resultado oficial.
export function motivoNoEliminable(
  carga: { estado: "PROCESANDO" | "EN_REVISION" | "CONFIRMADA" | "FALLIDA"; nombre: string },
  tareaEnProceso: boolean,
): string | null {
  if (carga.estado === "CONFIRMADA") {
    return `No se puede eliminar «${carga.nombre}»: sus resultados ya se confirmaron y forman parte del historial oficial.`;
  }
  if (tareaEnProceso) {
    return `No se puede eliminar «${carga.nombre}» mientras se lee su contenido. Inténtalo en unos minutos.`;
  }
  return null;
}

// RF-017: una lectura sin avance en 10 minutos se da por cortada (el proceso en segundo plano
// pudo terminar antes de tiempo) y se puede retomar.
export const TIEMPO_ATASCO_MS = 10 * 60 * 1000;

// «Volver a leer» se ofrece a una carga fallida o a una que lleva demasiado tiempo leyéndose.
// actualizadoEn es el de su tarea; sin tarea, la carga se puede volver a leer.
export function puedeVolverALeer(
  estado: "PROCESANDO" | "EN_REVISION" | "CONFIRMADA" | "FALLIDA",
  actualizadoEn: Date | null,
  ahora: Date,
): boolean {
  if (estado === "FALLIDA") return true;
  if (estado !== "PROCESANDO") return false;
  return !actualizadoEn || ahora.getTime() - actualizadoEn.getTime() > TIEMPO_ATASCO_MS;
}
