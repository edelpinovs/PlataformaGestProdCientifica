import { prisma } from "@/lib/prisma";
import { resolverClaveScopus, cifrarClaveScopus, proteccionConfigurada, mensajeConexionScopus } from "@/modules/produccion/configuracion-scopus";
import { fetchJsonConReintentos } from "@/modules/produccion/conectores/http";
import { consultarIndiceH } from "@/modules/produccion/conectores/scopus";

const ID = "institucional";

export async function obtenerClaveScopus() {
  const registro = await prisma.configuracionScopus.findUnique({ where: { id: ID }, select: { claveCifrada: true } });
  return resolverClaveScopus(registro?.claveCifrada, process.env.SCOPUS_CLAVE_MAESTRA, process.env.SCOPUS_API_KEY);
}

export async function estadoConfiguracionScopus() {
  const registro = await prisma.configuracionScopus.findUnique({ where: { id: ID }, select: { actualizadaEn: true } });
  return { configurada: !!registro || !!process.env.SCOPUS_API_KEY,
    origen: registro ? "Aplicación" : process.env.SCOPUS_API_KEY ? "Servidor" : "Sin configurar",
    actualizadaEn: registro?.actualizadaEn.toISOString() ?? null,
    protegida: proteccionConfigurada(process.env.SCOPUS_CLAVE_MAESTRA) };
}

export async function comprobarClaveScopus(clave: string) {
  const respuesta = await fetchJsonConReintentos<Record<string, unknown>>("https://api.elsevier.com/content/search/scopus", {
    params: { query: "DOCTYPE(ar)", count: 1 }, headers: { "X-ELS-APIKey": clave }, maxReintentos: 0, timeoutMs: 10000,
  });
  return mensajeConexionScopus(respuesta.status, !!respuesta.data?.["search-results"] && !respuesta.data?.["service-error"]);
}

export async function guardarClaveScopus(clave: string) {
  const claveCifrada = cifrarClaveScopus(clave, process.env.SCOPUS_CLAVE_MAESTRA);
  await prisma.configuracionScopus.upsert({ where: { id: ID }, create: { id: ID, claveCifrada }, update: { claveCifrada } });
}

/** Entrada de servidor para futuras pantallas que consulten el índice h. */
export async function consultarIndiceHConfigurado(scopusId: string) {
  const clave = await obtenerClaveScopus();
  return consultarIndiceH(scopusId, clave);
}
