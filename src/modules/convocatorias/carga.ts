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
