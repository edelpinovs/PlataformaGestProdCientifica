import { z } from "zod";
import { ejecutarEscaneo } from "./escaneo";
import type { PublicacionCandidata } from "./tipos";

const id = z.union([z.literal(1), z.literal(2)], { error: "Selecciona un profesor de demostración." });
export const memoriaDemoEsquema = z.object({
  obras: z.array(z.object({ id, titulo: z.string().max(150), doi: z.string().max(80), anio: z.number().int() })).max(2),
  autorias: z.array(z.object({ publicacionId: id, profesorId: id, estado: z.enum(["PENDIENTE", "VALIDADA", "RECHAZADA"]) })).max(4),
  cortes: z.array(z.object({ profesorId: id, fuente: z.enum(["ORCID", "OPENALEX"]), fecha: z.iso.datetime() })).max(4),
});
export type MemoriaDemo = z.infer<typeof memoriaDemoEsquema>;
export const solicitudDemoEsquema = z.object({
  operacion: z.enum(["escanear-1", "escanear-2", "validar-1", "rechazar-2", "reiniciar"], { error: "Selecciona una operación de demostración." }),
  anio: z.string({ error: "Indica un año válido." }).regex(/^$|^(19|20)\d{2}$/, "Indica un año entre 1900 y 2099 o deja el campo vacío."),
});
export const memoriaDemoVacia = (): MemoriaDemo => ({ obras: [], autorias: [], cortes: [] });
export const demoHabilitada = (entorno: string | undefined, bandera: string | undefined) => entorno === "development" && bandera === "1";

export async function ejecutarDemostracion(memoria: MemoriaDemo, operacion: z.infer<typeof solicitudDemoEsquema>["operacion"], anio?: number) {
  const copia = structuredClone(memoria);
  if (operacion === "reiniciar") return { memoria: memoriaDemoVacia(), mensaje: "Demostración reiniciada. No se modificó la base de datos." };
  if (operacion === "validar-1" || operacion === "rechazar-2") {
    const profesorId = operacion === "validar-1" ? 1 : 2;
    const filas = copia.autorias.filter((fila) => fila.profesorId === profesorId);
    if (!filas.length) return { memoria: copia, mensaje: "Primero escanea a ese profesor de demostración." };
    for (const fila of filas) fila.estado = profesorId === 1 ? "VALIDADA" : "RECHAZADA";
    return { memoria: copia, mensaje: "Estado simulado actualizado. Repite el escaneo para comprobar que se conserva." };
  }
  const profesorId = operacion === "escanear-1" ? 1 : 2;
  const fuentesConsultadas: string[] = [];
  const consultar = async (fuente: "ORCID" | "OPENALEX", anioFiltro?: number) => {
    fuentesConsultadas.push(`${fuente}: ${anioFiltro ?? "historial completo"}`);
    const obra = (numero: number, anio: number): PublicacionCandidata => ({ tipo: "ARTICULO", titulo: numero === 1 ? "[DEMO] Estudio ficticio sobre aprendizaje" : "[DEMO] Investigación ficticia sobre evaluación",
      doi: `10.0000/demo.historial.00${numero}`, anio, autoresTexto: "Persona Ficticia", fuente, profesorId });
    return { publicaciones: [obra(1, 2018), ...(fuente === "OPENALEX" ? [obra(2, 2023)] : [])].filter((obra) => anioFiltro === undefined || obra.anio === anioFiltro) };
  };
  const resumen = await ejecutarEscaneo({ profesorId, anio, fuentes: ["ORCID", "OPENALEX"], enriquecerAutores: false }, {
    obtenerProfesores: async () => [{ id: profesorId, nombres: profesorId === 1 ? "Elena Sofía" : "Tomás", apellidos: "Prueba Demostración", orcid: "0000-0000-0000-0001" }],
    buscarPorDoi: async (doi) => copia.obras.find((obra) => obra.doi === doi) ?? null,
    buscarSimilares: async () => [],
    persistirOActualizar: async (obra) => {
      const existente = copia.obras.find((fila) => fila.doi === obra.doi);
      if (existente) return existente.id;
      const id = obra.doi?.endsWith("001") ? 1 : 2;
      copia.obras.push({ id, titulo: obra.titulo, doi: obra.doi!, anio: obra.anio! });
      return id;
    },
    vincularAutoria: async (publicacionId, profesorId) => {
      if (copia.autorias.some((fila) => fila.publicacionId === publicacionId && fila.profesorId === profesorId)) return false;
      copia.autorias.push({ publicacionId: publicacionId as 1 | 2, profesorId: profesorId as 1 | 2, estado: "PENDIENTE" });
      return true;
    },
    obtenerUltimoCorte: async (profesorId, fuente) => {
      const corte = copia.cortes.find((fila) => fila.profesorId === profesorId && fila.fuente === fuente);
      return corte ? new Date(corte.fecha) : null;
    },
    registrarCorte: async (profesorId, fuente, fecha) => {
      const anterior = copia.cortes.find((fila) => fila.profesorId === profesorId && fila.fuente === fuente);
      if (anterior) anterior.fecha = fecha!.toISOString();
      else copia.cortes.push({ profesorId: profesorId as 1 | 2, fuente: fuente as "ORCID" | "OPENALEX", fecha: fecha!.toISOString() });
    },
  }, {
    consultarOrcid: (profesor, anio) => consultar("ORCID", anio),
    consultarOpenAlex: (profesor, anio) => consultar("OPENALEX", anio),
    consultarScopus: async () => { throw new Error("Scopus no participa en la demostración."); },
  });
  return { memoria: copia, mensaje: `Encontradas: ${resumen.publicacionesEncontradas}. Guardadas o actualizadas: ${resumen.publicacionesGuardadas}. Autorías nuevas: ${resumen.autoriasCreadas}.`, fuentesConsultadas };
}
