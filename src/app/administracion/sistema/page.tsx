import { estadoConfiguracionScopus } from "@/app/produccion/configuracion-scopus";
import { Marco } from "@/components/marco";
import { EtiquetaEstado, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { comprobarServicio, LIMITE_COMPROBACION_MS, nombreEntorno, versionCorta } from "@/modules/administracion/sistema";

// Estado del sistema, solo lectura. Nunca muestra valores de variables de entorno ni claves:
// solo si algo está configurado o responde.
export default async function SistemaPage() {
  const perfil = await requireModulo("administracion");

  const [base, scopus] = await Promise.all([
    comprobarServicio(() => prisma.$queryRaw`SELECT 1`),
    estadoConfiguracionScopus().catch(() => null),
  ]);
  const entorno = nombreEntorno(process.env.VERCEL_ENV);
  const version = versionCorta(process.env.VERCEL_GIT_COMMIT_SHA);

  const filas = [
    {
      nombre: "Base de datos",
      estado: base.responde ? <EtiquetaEstado tipo="exito">Responde</EtiquetaEstado> : <EtiquetaEstado tipo="error">No responde</EtiquetaEstado>,
      detalle: base.responde
        ? `Respuesta en ${base.milisegundos} ms.`
        : base.agotado
          ? `No respondió en ${LIMITE_COMPROBACION_MS / 1000} segundos. Revisa la conexión.`
          : "No se pudo consultar la base. Revisa la conexión.",
    },
    {
      nombre: "Clave de Scopus",
      estado: scopus?.configurada ? <EtiquetaEstado tipo="exito">Configurada</EtiquetaEstado> : <EtiquetaEstado tipo="aviso">Sin configurar</EtiquetaEstado>,
      detalle: scopus?.configurada ? `Origen: ${scopus.origen.toLowerCase()}.` : "Sin la clave no se pueden buscar publicaciones en Scopus.",
    },
    {
      nombre: "Protección de claves",
      estado: scopus?.protegida ? <EtiquetaEstado tipo="exito">Activa</EtiquetaEstado> : <EtiquetaEstado tipo="aviso">No configurada</EtiquetaEstado>,
      detalle: "Cifrado con el que se guardan las claves de las fuentes externas.",
    },
  ];

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="administracion" titulo="Estado del sistema"
      subtitulo="Qué está funcionando y qué falta configurar."
      volver={{ href: "/administracion", texto: "Administración" }}>
      <Panel titulo="Servicios" descripcion="Se comprueban al abrir la página. No se consultan las fuentes externas.">
        <ul className="flex flex-col">
          {filas.map((f) => (
            <li key={f.nombre} className="flex flex-wrap items-center justify-between gap-3 border-b border-linea py-3 text-sm last:border-0">
              <div className="flex flex-col">
                <span className="text-texto">{f.nombre}</span>
                <span className="text-xs text-texto-3">{f.detalle}</span>
              </div>
              {f.estado}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel titulo="Versión">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-texto-3">Entorno</dt>
            <dd className="text-texto">{entorno}</dd>
          </div>
          <div>
            <dt className="text-xs text-texto-3">Versión desplegada</dt>
            <dd className="font-mono text-texto">{version ?? "No disponible fuera de Vercel"}</dd>
          </div>
        </dl>
      </Panel>
    </Marco>
  );
}
