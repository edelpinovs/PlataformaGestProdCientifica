import { BarraListado } from "@/components/listado";
import { SelectorProfesor } from "@/components/selector-profesor";
import { COLUMNAS_PUBLICACIONES, RUTA_PUBLICACIONES, ETIQUETAS_TIPO, ETIQUETAS_FUENTE, ETIQUETAS_ESTADO, type ConsultaPublicaciones, type ErroresConsulta } from "@/modules/produccion/consulta";

export function FiltrosPublicaciones({ consulta, profesores, errores }: {
  consulta: ConsultaPublicaciones;
  profesores: { id: number; codigo: string; nombres: string; apellidos: string; estatusLaboral: string }[];
  errores: ErroresConsulta;
}) {
  const filtrosActivos = [consulta.q && `Texto: ${consulta.q}`,
    consulta.filtros.profesor && `Profesor: ${profesores.find((profesor) => profesor.id === Number(consulta.filtros.profesor))?.codigo ?? consulta.filtros.profesor}`,
    consulta.filtros.anio && `Año: ${consulta.filtros.anio}`,
    ...[ETIQUETAS_TIPO, ETIQUETAS_FUENTE, ETIQUETAS_ESTADO].map((etiquetas, indice) => {
      const valor = consulta.filtros[["tipo", "fuente", "estado"][indice]];
      return valor && (etiquetas as Record<string, string>)[valor];
    }),
  ].filter(Boolean);
  const opciones = (etiquetas: Record<string, string>) => Object.entries(etiquetas).map(([valor, texto]) => ({ valor, texto }));
  return <div className="flex flex-col gap-4">
    <details open={Object.keys(errores).length > 0}>
      <summary className="w-fit cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-marca hover:bg-hover">Buscar y filtrar publicaciones</summary>
      <div className="mt-4">
        <BarraListado base={RUTA_PUBLICACIONES} consulta={consulta} columnas={COLUMNAS_PUBLICACIONES} errores={errores}
          etiquetaBusqueda="Buscar publicaciones" placeholder="Título, autores, revista, DOI, tipo, fuente o profesor"
          filtros={[
            { clave: "profesor", etiqueta: "Profesor de la publicación", opciones: [], contenido: <div className="flex flex-col gap-4">
              <SelectorProfesor key={consulta.filtros.profesor || "todos"} opciones={profesores.map(profesor => ({ ...profesor,
                codigo: `${profesor.codigo}${profesor.estatusLaboral !== "ACTIVO" ? " (no activo)" : ""}`,
              }))} nombre="profesor" etiqueta="Profesor de la publicación" requerido={false}
                valorInicial={consulta.filtros.profesor ? Number(consulta.filtros.profesor) : undefined} error={errores.profesor} />
              <p className="text-xs text-texto-3">Sin selección se muestran publicaciones de todos los profesores, incluidos los no activos.</p>
            </div> },
            { clave: "anio", etiqueta: "Año de publicación", opciones: Array.from({ length: 201 }, (_, indice) => ({ valor: String(2100 - indice), texto: String(2100 - indice) })) },
            { clave: "tipo", etiqueta: "Tipo", opciones: opciones(ETIQUETAS_TIPO) },
            { clave: "fuente", etiqueta: "Fuente", opciones: opciones(ETIQUETAS_FUENTE) },
            { clave: "estado", etiqueta: "Estado de autoría", opciones: opciones(ETIQUETAS_ESTADO) },
          ]} />
      </div>
    </details>
    {filtrosActivos.length > 0 && <ul aria-label="Filtros activos" className="flex flex-wrap gap-4">
      {filtrosActivos.map((filtro) => <li key={String(filtro)} className="max-w-full break-words rounded-full bg-marca-suave px-3 py-1 text-xs text-texto">{filtro}</li>)}
    </ul>}
  </div>;
}
