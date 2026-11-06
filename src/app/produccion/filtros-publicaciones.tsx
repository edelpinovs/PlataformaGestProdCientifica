import Link from "next/link";
import { claseBoton, claseBotonSecundario, claseCampo, claseEtiqueta } from "@/components/ui";
import { ETIQUETAS_TIPO, ETIQUETAS_FUENTE, ETIQUETAS_ESTADO, type ConsultaPublicaciones, type ErroresConsulta } from "@/modules/produccion/consulta";

export function FiltrosPublicaciones({ consulta, profesores, errores }: {
  consulta: ConsultaPublicaciones;
  profesores: { id: number; codigo: string; nombres: string; apellidos: string; estatusLaboral: string }[];
  errores: ErroresConsulta;
}) {
  const filtros = [consulta.texto && `Texto: ${consulta.texto}`,
    consulta.profesor && `Profesor: ${profesores.find((profesor) => profesor.id === Number(consulta.profesor))?.codigo ?? consulta.profesor}`,
    consulta.anio && `Año: ${consulta.anio}`, consulta.tipo && ETIQUETAS_TIPO[consulta.tipo],
    consulta.fuente && ETIQUETAS_FUENTE[consulta.fuente], consulta.estado && ETIQUETAS_ESTADO[consulta.estado],
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-4">
      <form action="/produccion#publicaciones" method="get" className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className={`${claseEtiqueta} min-w-0`}>Buscar publicaciones
            <input name="texto" defaultValue={consulta.texto} maxLength={200} placeholder="Título, autores o DOI"
              aria-invalid={Boolean(errores.texto)} className={`${claseCampo(Boolean(errores.texto))} min-w-0 w-full`} />
          </label>
          <label className={`${claseEtiqueta} min-w-0`}>Profesor de la publicación
            <select name="profesor" defaultValue={consulta.profesor} aria-invalid={Boolean(errores.profesor)} className={`${claseCampo(Boolean(errores.profesor))} min-w-0 w-full`}>
              <option value="">Todos los profesores</option>
              {profesores.map((profesor) => <option key={profesor.id} value={profesor.id}>
                {profesor.apellidos}, {profesor.nombres} · {profesor.codigo}{profesor.estatusLaboral !== "ACTIVO" ? " (no activo)" : ""}
              </option>)}
            </select>
          </label>
          <label className={`${claseEtiqueta} min-w-0`}>Año de publicación
            <input name="anio" type="number" min="1900" max="2100" defaultValue={consulta.anio} placeholder="Todos los años"
              aria-invalid={Boolean(errores.anio)} className={`${claseCampo(Boolean(errores.anio))} min-w-0 w-full`} />
          </label>
          <label className={`${claseEtiqueta} min-w-0`}>Tipo de publicación
            <select name="tipo" defaultValue={consulta.tipo} aria-invalid={Boolean(errores.tipo)} className={`${claseCampo(Boolean(errores.tipo))} min-w-0 w-full`}>
              <option value="">Todos los tipos</option>
              {Object.entries(ETIQUETAS_TIPO).map(([clave, etiqueta]) => <option key={clave} value={clave}>{etiqueta}</option>)}
            </select>
          </label>
          <label className={`${claseEtiqueta} min-w-0`}>Fuente
            <select name="fuente" defaultValue={consulta.fuente} aria-invalid={Boolean(errores.fuente)} className={`${claseCampo(Boolean(errores.fuente))} min-w-0 w-full`}>
              <option value="">Todas las fuentes</option>
              {Object.entries(ETIQUETAS_FUENTE).map(([clave, etiqueta]) => <option key={clave} value={clave}>{etiqueta}</option>)}
            </select>
          </label>
          <label className={`${claseEtiqueta} min-w-0`}>Estado de autoría
            <select name="estado" defaultValue={consulta.estado} aria-invalid={Boolean(errores.estado)} className={`${claseCampo(Boolean(errores.estado))} min-w-0 w-full`}>
              <option value="">Todos los estados</option>
              {Object.entries(ETIQUETAS_ESTADO).map(([clave, etiqueta]) => <option key={clave} value={clave}>{etiqueta}</option>)}
            </select>
          </label>
          <label className={`${claseEtiqueta} min-w-0`}>Filas por página
            <select name="tamanio" defaultValue={consulta.tamanio} aria-invalid={Boolean(errores.tamanio)} className={`${claseCampo(Boolean(errores.tamanio))} min-w-0 w-full`}>
              {[20, 50, 100].map((tamanio) => <option key={tamanio} value={tamanio}>{tamanio}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-4">
          <button type="submit" className={claseBoton}>Aplicar filtros</button>
          <Link href="/produccion#publicaciones" className={claseBotonSecundario}>Limpiar filtros</Link>
        </div>
      </form>
      {filtros.length > 0 && <ul aria-label="Filtros activos" className="flex flex-wrap gap-4">
        {filtros.map((filtro) => <li key={String(filtro)} className="max-w-full break-words rounded-full bg-marca-suave px-3 py-1 text-xs text-texto">{filtro}</li>)}
      </ul>}
    </div>
  );
}
