import { BarraListado } from "@/components/listado";
import { SelectorProfesor } from "@/components/selector-profesor";
import { COLUMNAS_PUBLICACIONES, RUTA_PUBLICACIONES, ETIQUETAS_TIPO, ETIQUETAS_FUENTE, ETIQUETAS_ESTADO, opcionesAnioPublicacion, type ConsultaPublicaciones, type ErroresConsulta } from "@/modules/produccion/consulta";
import { fechaCorta } from "@/modules/produccion/rango-escaneo";

export function FiltrosPublicaciones({ consulta, profesores, errores, anioActual }: {
  anioActual: number;
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
    consulta.filtros.desde && `Desde: ${fechaCorta(consulta.filtros.desde)}`,
    consulta.filtros.hasta && `Hasta: ${fechaCorta(consulta.filtros.hasta)}`,
  ].filter(Boolean);
  const opciones = (etiquetas: Record<string, string>) => Object.entries(etiquetas).map(([valor, texto]) => ({ valor, texto }));
  // @container: el campo de profesor mide el ancho del formulario (100cqw) y ocupa su propia línea.
  return <div className="@container flex flex-col gap-4">
    <BarraListado base={RUTA_PUBLICACIONES} consulta={consulta} columnas={COLUMNAS_PUBLICACIONES} errores={errores}
      etiquetaBusqueda="Buscar publicaciones" placeholder="Título, autores, revista o DOI"
      filtros={[
        { clave: "tipo", etiqueta: "Tipo", opciones: opciones(ETIQUETAS_TIPO) },
        { clave: "fuente", etiqueta: "Fuente", opciones: opciones(ETIQUETAS_FUENTE) },
        { clave: "estado", etiqueta: "Estado de autoría", opciones: opciones(ETIQUETAS_ESTADO) },
        // Año, Desde y Hasta van juntos y con el mismo estilo que las demás listas: son la fecha de publicación.
        { clave: "anio", etiqueta: "Año", opciones: opcionesAnioPublicacion(anioActual) },
        ...([{ clave: "desde", etiqueta: "Desde" }, { clave: "hasta", etiqueta: "Hasta" }] as const).map(({ clave, etiqueta }) => ({
          clave, etiqueta, opciones: [],
          contenido: <label className={`flex min-w-0 items-center gap-2 rounded-xl border bg-superficie px-3 text-sm text-texto-3 ${errores[clave] ? "border-peligro" : "border-linea"}`}>
            {etiqueta}
            <span className="sr-only"> (fecha de publicación)</span>
            <input type="date" name={clave} defaultValue={consulta.filtros[clave]} aria-invalid={Boolean(errores[clave])}
              className={`min-w-0 bg-transparent py-2.5 text-sm font-medium focus:outline-2 focus:outline-marca ${errores[clave] ? "text-peligro" : "text-texto"}`} />
          </label>,
        })),
        // Al final y en su propia línea: su ayuda y la selección lo hacen más alto que las listas.
        { clave: "profesor", etiqueta: "Profesor", opciones: [], contenido: <div className="w-[100cqw]"><div className="flex max-w-md flex-col gap-2">
          <SelectorProfesor key={consulta.filtros.profesor || "todos"} opciones={profesores.map(profesor => ({ ...profesor,
            codigo: `${profesor.codigo}${profesor.estatusLaboral !== "ACTIVO" ? " (no activo)" : ""}`,
          }))} nombre="profesor" etiqueta="Profesor" requerido={false}
            valorInicial={consulta.filtros.profesor ? Number(consulta.filtros.profesor) : undefined} error={errores.profesor} />
          <p className="text-xs text-texto-3">Sin profesor elegido se muestran las publicaciones de todos, también de los no activos.</p>
        </div></div> },
      ]} />
    {filtrosActivos.length > 0 && <ul aria-label="Filtros activos" className="flex flex-wrap gap-2">
      {filtrosActivos.map((filtro) => <li key={String(filtro)} className="max-w-full break-words rounded-full bg-marca-suave px-3 py-1 text-xs text-texto">{filtro}</li>)}
    </ul>}
  </div>;
}
