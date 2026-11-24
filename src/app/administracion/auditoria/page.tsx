import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { Descargas } from "../descargas";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { ACCIONES_AUDITORIA, CLAVES_ACCION, MODULOS_AUDITORIA, type AccionAuditoria } from "@/modules/administracion/auditoria";
import { COLUMNAS_AUDITORIA, filtroAuditoria, LISTADO_AUDITORIA, ordenAuditoria } from "@/modules/administracion/auditoria-listado";

const BASE = "/administracion/auditoria";
const formatoFecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

const textoModulo = (clave: string) => MODULOS_AUDITORIA.find((m) => m.valor === clave)?.texto ?? clave;
const textoAccion = (clave: string) => ACCIONES_AUDITORIA[clave as AccionAuditoria]?.texto ?? clave;

// Bitácora de solo lectura: un registro histórico no se edita ni se elimina (issue 242).
export default async function AuditoriaPage({ searchParams }: PageProps<"/administracion/auditoria">) {
  const perfil = await requireModulo("administracion");

  // Búsqueda, filtros, orden y página vienen de la URL (D-009); lo inválido se ignora y se avisa.
  const { consulta, errores } = analizarListado(LISTADO_AUDITORIA, await searchParams);
  const where = filtroAuditoria(consulta);
  const total = await prisma.auditoria.count({ where });
  const paginacion = paginar(total, consulta);
  const registros = await prisma.auditoria.findMany({
    where, orderBy: ordenAuditoria(consulta), skip: paginacion.salto, take: paginacion.tamanio,
  });
  const contexto = { base: BASE, definicion: LISTADO_AUDITORIA, consulta: { ...consulta, pagina: paginacion.pagina } };

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="administracion" titulo="Auditoría"
      subtitulo="Quién hizo qué y cuándo en el panel de administración."
      volver={{ href: "/administracion", texto: "Administración" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-marca-suave px-3 py-1 text-xs font-medium text-marca">
          {new Intl.NumberFormat("es-MX").format(total)} {hayFiltrosActivos(consulta) ? "coinciden" : "registros"}
        </span>
        <Descargas listado="auditoria" definicion={LISTADO_AUDITORIA} consulta={consulta} />
      </div>

      <Panel titulo="Bitácora" descripcion="Solo lectura. Los registros no se pueden editar ni eliminar.">
        <div className="flex flex-col gap-4">
          <BarraListado {...contexto} columnas={COLUMNAS_AUDITORIA} errores={errores}
            etiquetaBusqueda="Buscar en la bitácora" placeholder="Persona, módulo, acción o texto"
            filtros={[
              { clave: "modulo", etiqueta: "Módulo", opciones: MODULOS_AUDITORIA.map((m) => ({ valor: m.valor, texto: m.texto })) },
              { clave: "accion", etiqueta: "Acción", opciones: CLAVES_ACCION.map((a) => ({ valor: a, texto: ACCIONES_AUDITORIA[a].texto })) },
            ]} />
          {registros.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta) ? "Ningún registro coincide con la búsqueda. Prueba con otro texto o quita los filtros." : "Aún no hay registros en la bitácora."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="fecha" className={claseTabla.celdaEncabezado}>Fecha</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="actor" className={claseTabla.celdaEncabezado}>Persona</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="modulo" className={claseTabla.celdaEncabezado}>Módulo</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="accion" className={claseTabla.celdaEncabezado}>Acción</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0`}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className={claseTabla.fila}>
                    <td className={`${claseTabla.celda} whitespace-nowrap`}>{formatoFecha.format(r.creadoEn)}</td>
                    <td className={`${claseTabla.celda} break-all text-texto`}>{r.actorCorreo}</td>
                    <td className={claseTabla.celda}>{textoModulo(r.modulo)}</td>
                    <td className={claseTabla.celda}>{textoAccion(r.accion)}</td>
                    <td className={`${claseTabla.celda} pr-0`}>{r.resumen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="registros" />
        </div>
      </Panel>
    </Marco>
  );
}
