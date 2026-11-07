"use server";
import { requireModulo } from "@/lib/auth/session";
import { demoHabilitada, ejecutarDemostracion, memoriaDemoEsquema, memoriaDemoVacia, solicitudDemoEsquema, type MemoriaDemo } from "@/modules/produccion/demostracion";

export type EstadoDemo = { memoria: MemoriaDemo; mensaje?: string; error?: string; fuentesConsultadas?: string[] };
export async function demostrarEscaneoAction(anterior: EstadoDemo, datos: FormData): Promise<EstadoDemo> {
  await requireModulo("produccion");
  if (!demoHabilitada(process.env.NODE_ENV, process.env.PRODUCCION_DEMO)) return { memoria: memoriaDemoVacia(), error: "La demostración solo está disponible en desarrollo cuando se habilita expresamente." };
  const memoria = memoriaDemoEsquema.safeParse(anterior?.memoria);
  const solicitud = solicitudDemoEsquema.safeParse({ operacion: datos.get("operacion"), anio: datos.get("anio") ?? "" });
  if (!memoria.success || !solicitud.success) return { memoria: memoria.success ? memoria.data : memoriaDemoVacia(), error: "Revisa la operación y el año de demostración. Si el estado no es válido, reinicia la prueba." };
  try { return await ejecutarDemostracion(memoria.data, solicitud.data.operacion, solicitud.data.anio ? Number(solicitud.data.anio) : undefined); }
  catch { return { memoria: memoria.data, error: "No se pudo completar la simulación. Puedes reiniciarla." }; }
}
