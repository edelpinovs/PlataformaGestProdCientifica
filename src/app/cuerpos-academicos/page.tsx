import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { ETIQUETA_NIVEL, NIVELES_CONSOLIDACION } from "@/modules/cuerpos-academicos/cuerpo";
import {
  COLUMNAS_CUERPOS, filtroCuerpos, listadoCuerpos, ordenCuerpos,
} from "@/modules/cuerpos-academicos/cuerpos-listado";
import { getModulo } from "@/modules/registry";
import { FilaCuerpo } from "./fila";
import { FormularioCuerpo } from "./formulario";

const BASE = "/cuerpos-academicos";

export default async function CuerposAcademicosPage({ searchParams }: PageProps<"/cuerpos-academicos">) {
  const perfil = await requireModulo("cuerpos-academicos");
  const modulo = getModulo("cuerpos-academicos");

  const parametros = await searchParams;
  const { editado, eliminado } = parametros;
  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de «${editado}».`
    : typeof eliminado === "string" ? `Se eliminó «${eliminado}».`
    : null;

  const departamentos = await prisma.departamento.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, nomenclatura: true },
  });

  const definicion = listadoCuerpos(departamentos.map((d) => d.id));
  const { consulta, errores } = analizarListado(definicion, parametros);
  const where = filtroCuerpos(consulta);
  const total = await prisma.cuerpoAcademico.count({ where });
  const paginacion = paginar(total, consulta);
  const cuerpos = await prisma.cuerpoAcademico.findMany({
    where,
    orderBy: ordenCuerpos(consulta),
    skip: paginacion.salto,
    take: paginacion.tamanio,
    include: {
      departamento: { select: { nombre: true, nomenclatura: true } },
      lider: { select: { nombres: true, apellidos: true, codigo: true } },
      _count: { select: { integrantes: true, lgacs: true } },
    },
  });
  const contexto = { base: BASE, definicion, consulta: { ...consulta, pagina: paginacion.pagina } };
  const hayFiltros = hayFiltrosActivos(consulta);
  const encabezado = claseTabla.celdaEncabezado;
  const encabezadoSm = `${claseTabla.celdaEncabezado} hidden sm:table-cell`;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="cuerpos-academicos" titulo={modulo.nombre}
      subtitulo="Registro de CA, integrantes, líder único, LGAC y PRODEP activo.">
      <Panel titulo="Registrar cuerpo académico" descripcion="RF-012 · CU-007">
        {departamentos.length === 0 ? (
          <EstadoVacio>
            Todo cuerpo académico pertenece a un departamento. Pide a un administrador que registre departamentos en Catálogos.
          </EstadoVacio>
        ) : (
          <FormularioCuerpo departamentos={departamentos} />
        )}
      </Panel>

      <Panel titulo={`Registrados (${total})`}>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        <div className="flex flex-col gap-4">
          <BarraListado {...contexto} columnas={COLUMNAS_CUERPOS} errores={errores}
            etiquetaBusqueda="Buscar cuerpos académicos" placeholder="Clave, nombre, departamento o líder"
            filtros={[
              {
                clave: "nivel",
                etiqueta: "Nivel",
                opciones: NIVELES_CONSOLIDACION.map((nivel) => ({ valor: nivel, texto: ETIQUETA_NIVEL[nivel] })),
              },
              {
                clave: "departamento",
                etiqueta: "Departamento",
                opciones: departamentos.map((d) => ({ valor: String(d.id), texto: d.nombre })),
              },
            ]} />
          {cuerpos.length === 0 ? (
            <EstadoVacio>
              {hayFiltros
                ? "No hay cuerpos académicos con esta búsqueda. Prueba con otro texto o limpia los filtros."
                : "Aún no hay cuerpos académicos registrados."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="clave" className={encabezado}>Clave</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="nombre" className={encabezado}>Nombre</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="nivel" className={encabezadoSm}>Nivel</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="departamento" className={encabezadoSm}>Departamento</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="vigencia" className={encabezadoSm}>Vigencia</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="integrantes" className={encabezadoSm}>Integrantes</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="lider" className={encabezadoSm}>Líder</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="lgacs" className={encabezadoSm}>LGAC</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cuerpos.map((c) => (
                  <FilaCuerpo
                    key={`${c.id}-${c.clave}-${c.nombre}-${c.nivel}-${c.departamentoId}-${c.anioRegistro}-${c.anioVencimiento}`}
                    cuerpo={c}
                    departamentos={departamentos}
                  />
                ))}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="cuerpos académicos" />
        </div>
      </Panel>
    </Marco>
  );
}
