import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { Descargas } from "../descargas";
import { hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { PERIODOS } from "@/modules/administracion/fechas";
import { ACCIONES_AUDITORIA, CLAVES_ACCION, MODULOS_AUDITORIA, type AccionAuditoria } from "@/modules/administracion/auditoria";
import { analizarAuditoria, COLUMNAS_AUDITORIA, filtroAuditoria, LISTADO_AUDITORIA, ordenAuditoria } from "@/modules/administracion/auditoria-listado";

const BASE = "/administracion/auditoria";
const formatoFecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

const textoModulo = (clave: string) => MODULOS_AUDITORIA.find((m) => m.valor === clave)?.texto ?? clave;
const textoAccion = (clave: string) => ACCIONES_AUDITORIA[clave as AccionAuditoria]?.texto ?? clave;

// Bitácora de solo lectura: un registro histórico no se edita ni se elimina (issue 242).
export default async function AuditoriaPage({ searchParams }: PageProps<"/administracion/auditoria">) {
  const perfil = await requireModulo("administracion");

  // Búsqueda, filtros, orden y página vienen de la URL (D-009); lo inválido se ignora y se avisa.
  const { consulta, errores } = analizarAuditoria(await searchParams);
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
            etiquetaBusqueda="Buscar en la bitácora" placeholder="Persona, módulo, acción, texto o fecha (2026-11-24)"
            filtros={[
              // Con un solo módulo registrado el filtro no sirve; aparece cuando otro módulo escriba en la bitácora.
              ...(MODULOS_AUDITORIA.length > 1
                ? [{ clave: "modulo", etiqueta: "Módulo", opciones: MODULOS_AUDITORIA.map((m) => ({ valor: m.valor, texto: m.texto })) }]
                : []),
              { clave: "accion", etiqueta: "Acción", opciones: CLAVES_ACCION.map((a) => ({ valor: a, texto: ACCIONES_AUDITORIA[a].texto })) },
              { clave: "periodo", etiqueta: "Periodo", opciones: PERIODOS.map((p) => ({ valor: p.valor, texto: p.texto })) },
              // Rango libre; Desde y Hasta forman un grupo para que no se separen al acomodarse la fila.
              { clave: "desde", etiqueta: "Fecha", opciones: [], contenido: (
                <div role="group" aria-label="Rango de fechas" className="flex flex-wrap gap-3">
                  {([{ clave: "desde", etiqueta: "Desde" }, { clave: "hasta", etiqueta: "Hasta" }] as const).map(({ clave, etiqueta }) => (
                    <label key={clave}
                      className={`flex min-w-0 items-center gap-2 rounded-xl border bg-superficie px-3 text-sm text-texto-3 ${errores[clave] ? "border-peligro" : "border-linea"}`}>
                      {etiqueta}
                      <span className="sr-only"> (fecha del registro)</span>
                      <input type="date" name={clave} defaultValue={consulta.filtros[clave]} aria-invalid={Boolean(errores[clave])}
                        className={`min-w-0 bg-transparent py-2.5 text-sm font-medium focus:outline-2 focus:outline-marca ${errores[clave] ? "text-peligro" : "text-texto"}`} />
                    </label>
                  ))}
                </div>
              ) },
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
                  <EncabezadoOrdenable {...contexto} columna="actor" className={`${claseTabla.celdaEncabezado} hidden md:table-cell`}>Persona</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="modulo" className={`${claseTabla.celdaEncabezado} hidden md:table-cell`}>Módulo</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="accion" className={`${claseTabla.celdaEncabezado} hidden md:table-cell`}>Acción</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 hidden md:table-cell`}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className={claseTabla.fila}>
                    <td className={claseTabla.celda}>
                      <span className="block whitespace-nowrap">{formatoFecha.format(r.creadoEn)}</span>
                      {/* En celular las columnas se apilan bajo la fecha. */}
                      <span className="mt-1 flex flex-col gap-0.5 text-xs text-texto-3 md:hidden">
                        <span className="break-all text-texto">{r.actorCorreo}</span>
                        <span>{textoModulo(r.modulo)} · {textoAccion(r.accion)}</span>
                        <span>{r.resumen}</span>
                      </span>
                    </td>
                    <td className={`${claseTabla.celda} break-all text-texto hidden md:table-cell`}>{r.actorCorreo}</td>
                    <td className={`${claseTabla.celda} hidden md:table-cell`}>{textoModulo(r.modulo)}</td>
                    <td className={`${claseTabla.celda} hidden md:table-cell`}>{textoAccion(r.accion)}</td>
                    <td className={`${claseTabla.celda} pr-0 hidden md:table-cell`}>{r.resumen}</td>
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
