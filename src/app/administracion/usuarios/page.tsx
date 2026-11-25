import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { ETIQUETA_ROL, ROLES } from "@/lib/auth/roles";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { formatoFechaAlta } from "@/modules/administracion/fechas";
import { matrizPermisos } from "@/modules/administracion/usuarios";
import {
  COLUMNAS_USUARIOS,
  ESTADOS_USUARIO,
  filtroUsuarios,
  LISTADO_USUARIOS,
  ordenUsuarios,
} from "@/modules/administracion/usuarios-listado";
import { MODULOS } from "@/modules/registry";
import { Descargas } from "../descargas";
import { cambiarEstadoUsuario, editarUsuario } from "./actions";
import { FilaUsuario } from "./fila-usuario";

const BASE = "/administracion/usuarios";

export default async function UsuariosPage({ searchParams }: PageProps<"/administracion/usuarios">) {
  const perfil = await requireModulo("administracion");

  // Editar y cambiar el estado redirigen aquí con el resultado.
  const parametros = await searchParams;
  const { editado, desactivado, reactivado } = parametros;
  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de «${editado}».`
    : typeof desactivado === "string" ? `Se desactivó el acceso de «${desactivado}».`
    : typeof reactivado === "string" ? `Se reactivó el acceso de «${reactivado}».`
    : null;

  // Búsqueda, filtros, orden y página vienen de la URL (D-009); lo inválido se ignora y se avisa.
  const { consulta, errores } = analizarListado(LISTADO_USUARIOS, parametros);
  const where = filtroUsuarios(consulta);
  const total = await prisma.perfil.count({ where });
  const paginacion = paginar(total, consulta);
  const usuarios = await prisma.perfil.findMany({
    where,
    orderBy: ordenUsuarios(consulta),
    skip: paginacion.salto,
    take: paginacion.tamanio,
    select: {
      id: true, correo: true, rol: true, activo: true, creadoEn: true,
      profesor: { select: { id: true, nombres: true, apellidos: true, codigo: true } },
    },
  });
  // Profesores que todavía no tienen perfil: son los que se pueden vincular (uno por profesor).
  const libres = await prisma.profesor.findMany({
    where: { perfil: { is: null } },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }, { id: "asc" }],
    select: { id: true, nombres: true, apellidos: true, codigo: true },
  });
  const contexto = { base: BASE, definicion: LISTADO_USUARIOS, consulta: { ...consulta, pagina: paginacion.pagina } };
  const matriz = matrizPermisos(MODULOS);

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="administracion" titulo="Usuarios y roles"
      subtitulo="Quién entra al sistema y qué puede hacer."
      volver={{ href: "/administracion", texto: "Administración" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-marca-suave px-3 py-1 text-xs font-medium text-marca">
          {new Intl.NumberFormat("es-MX").format(total)} {hayFiltrosActivos(consulta) ? "coinciden" : "personas con acceso"}
        </span>
        <Descargas listado="usuarios" definicion={LISTADO_USUARIOS} consulta={consulta} />
      </div>

      <Panel titulo="Personas con acceso" descripcion="Cada profesor puede tener un solo perfil de acceso. Al desactivar a alguien se conservan sus registros.">
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        <div className="flex flex-col gap-4">
          <BarraListado {...contexto} columnas={COLUMNAS_USUARIOS} errores={errores}
            etiquetaBusqueda="Buscar usuarios" placeholder="Correo, rol, profesor, estado o alta (2026-11-24)"
            filtros={[
              { clave: "rol", etiqueta: "Rol", opciones: ROLES.map((r) => ({ valor: r, texto: ETIQUETA_ROL[r] })) },
              { clave: "estado", etiqueta: "Estado", opciones: ESTADOS_USUARIO.map((e) => ({ valor: e.valor, texto: e.texto })) },
            ]} />
          {usuarios.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta) ? "Ninguna persona coincide con la búsqueda. Prueba con otro texto o quita los filtros." : "Aún no hay usuarios registrados."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="correo" className={claseTabla.celdaEncabezado}>Correo</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="rol" className={claseTabla.celdaEncabezado}>Rol</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="profesor" className={claseTabla.celdaEncabezado}>Profesor vinculado</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="estado" className={claseTabla.celdaEncabezado}>Estado</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="alta" className={claseTabla.celdaEncabezado}>Alta</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  // La key incluye los datos: tras guardar, la fila vuelve a mostrarse cerrada.
                  <FilaUsuario key={`${u.id}-${u.rol}-${u.activo}-${u.profesor?.id ?? 0}`} id={u.id} correo={u.correo}
                    rol={u.rol} activo={u.activo} profesor={u.profesor} alta={formatoFechaAlta.format(u.creadoEn)} esPropio={u.id === perfil.id}
                    opcionesProfesor={u.profesor ? [u.profesor, ...libres] : libres}
                    editar={editarUsuario} cambiarEstado={cambiarEstadoUsuario} />
                ))}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="usuarios" />
        </div>
      </Panel>

      <Panel titulo="Qué puede hacer cada rol" descripcion="Solo lectura. Sale del registro de módulos.">
        <div className="overflow-x-auto">
          <table className={claseTabla.tabla}>
            <thead className={claseTabla.encabezado}>
              <tr>
                <th className={claseTabla.celdaEncabezado}>Módulo</th>
                {ROLES.map((r) => <th key={r} className={`${claseTabla.celdaEncabezado} text-center`}>{ETIQUETA_ROL[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {matriz.map((fila) => (
                <tr key={fila.slug} className={claseTabla.fila}>
                  <td className={claseTabla.celda}>{fila.nombre}</td>
                  {ROLES.map((r) => (
                    <td key={r} className={`${claseTabla.celda} text-center ${fila.roles[r] ? "text-exito" : "text-texto-3"}`}>
                      <span aria-hidden="true">{fila.roles[r] ? "✓" : "—"}</span>
                      <span className="sr-only">{fila.roles[r] ? "Sí" : "No"}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </Marco>
  );
}
