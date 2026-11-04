"use client";

import { useActionState, useState } from "react";
import type { EstadoFila } from "@/components/fila-editable";
import {
  Aviso,
  claseAccionFila,
  claseBoton,
  claseBotonPeligro,
  claseBotonSecundario,
  claseCampo,
  claseEtiqueta,
  claseTabla,
  EtiquetaEstado,
} from "@/components/ui";
import { ETIQUETA_FUENTE, type FuentePublicacion } from "@/modules/validacion/bandeja";
import { ETIQUETAS_TIPO, TIPOS_PUBLICACION, type TipoPublicacion } from "@/modules/validacion/manual";
import { confirmarAutoria, editarMetadatosBandeja, rechazarHomonimo } from "./actions";

type PublicacionBandeja = {
  id: number;
  tipo: TipoPublicacion;
  titulo: string;
  autoresTexto: string;
  revistaEditorial: string | null;
  isbnIssn: string | null;
  doi: string | null;
  fechaPublicacion: Date | null;
  fuente: FuentePublicacion;
  profesorId: number;
  profesorNombre: string;
};

export function FilaBandeja({ publicacion }: { publicacion: PublicacionBandeja }) {
  const [editando, setEditando] = useState(false);
  const [confirmandoRechazo, setConfirmandoRechazo] = useState(false);

  const [estadoEdicion, accionEditar, enviandoEdicion] = useActionState<EstadoFila, FormData>(
    async (prev, formData) => {
      const res = await editarMetadatosBandeja(prev, formData);
      if (!res.error) setEditando(false);
      return res;
    },
    {},
  );

  if (editando) {
    return (
      <tr className={claseTabla.fila}>
        <td colSpan={4} className="p-4">
          <form action={accionEditar} className="flex flex-col gap-4 rounded-xl bg-superficie-alt p-4">
            <input type="hidden" name="id" value={publicacion.id} />
            <h3 className="text-sm font-semibold">Editar metadatos de la publicación</h3>

            {estadoEdicion.error && <Aviso tipo="error">{estadoEdicion.error}</Aviso>}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={claseEtiqueta}>
                Tipo de publicación
                <select
                  name="tipo"
                  defaultValue={publicacion.tipo}
                  aria-invalid={estadoEdicion.campo === "tipo"}
                  className={claseCampo(estadoEdicion.campo === "tipo")}
                >
                  {TIPOS_PUBLICACION.map((t) => (
                    <option key={t} value={t}>
                      {ETIQUETAS_TIPO[t]}
                    </option>
                  ))}
                </select>
              </label>

              <label className={claseEtiqueta}>
                DOI
                <input
                  name="doi"
                  type="text"
                  defaultValue={publicacion.doi ?? ""}
                  placeholder="ej. 10.1000/182"
                  aria-invalid={estadoEdicion.campo === "doi"}
                  className={claseCampo(estadoEdicion.campo === "doi")}
                />
              </label>
            </div>

            <label className={claseEtiqueta}>
              Título
              <input
                name="titulo"
                type="text"
                required
                defaultValue={publicacion.titulo}
                aria-invalid={estadoEdicion.campo === "titulo"}
                className={claseCampo(estadoEdicion.campo === "titulo")}
              />
            </label>

            <label className={claseEtiqueta}>
              Autores
              <input
                name="autoresTexto"
                type="text"
                required
                defaultValue={publicacion.autoresTexto}
                aria-invalid={estadoEdicion.campo === "autoresTexto"}
                className={claseCampo(estadoEdicion.campo === "autoresTexto")}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={claseEtiqueta}>
                Revista o Editorial
                <input
                  name="revistaEditorial"
                  type="text"
                  defaultValue={publicacion.revistaEditorial ?? ""}
                  aria-invalid={estadoEdicion.campo === "revistaEditorial"}
                  className={claseCampo(estadoEdicion.campo === "revistaEditorial")}
                />
              </label>

              <label className={claseEtiqueta}>
                ISBN / ISSN
                <input
                  name="isbnIssn"
                  type="text"
                  defaultValue={publicacion.isbnIssn ?? ""}
                  aria-invalid={estadoEdicion.campo === "isbnIssn"}
                  className={claseCampo(estadoEdicion.campo === "isbnIssn")}
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditando(false)}
                className={claseBotonSecundario}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviandoEdicion}
                className={claseBoton}
              >
                {enviandoEdicion ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  if (confirmandoRechazo) {
    return (
      <tr className={claseTabla.fila}>
        <td colSpan={4} className="p-4">
          <div className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4 text-sm text-peligro">
            <p className="font-semibold">
              ¿Confirmas que deseas rechazar esta obra por homónimo?
            </p>
            <p className="text-xs">
              «{publicacion.titulo}» quedará registrada como exclusión para que los escaneos futuros no vuelvan a sugerirla.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmandoRechazo(false)}
                className={claseBotonSecundario}
              >
                Cancelar
              </button>
              <form action={rechazarHomonimo}>
                <input type="hidden" name="publicacionId" value={publicacion.id} />
                <input type="hidden" name="profesorId" value={publicacion.profesorId} />
                <button type="submit" className={claseBotonPeligro}>
                  Sí, rechazar por homónimo
                </button>
              </form>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={claseTabla.fila}>
      <td className={`${claseTabla.celda} hidden sm:table-cell`}>
        <div className="flex flex-col gap-1 items-start">
          <EtiquetaEstado tipo="aviso">
            {ETIQUETA_FUENTE[publicacion.fuente] ?? publicacion.fuente}
          </EtiquetaEstado>
          <span className="text-xs text-texto-3">{ETIQUETAS_TIPO[publicacion.tipo] ?? publicacion.tipo}</span>
        </div>
      </td>

      <td className={claseTabla.celda}>
        <div className="flex flex-col gap-0.5">
          {/* En celular, muestra fuente y tipo encima */}
          <div className="flex items-center gap-1.5 sm:hidden mb-1">
            <EtiquetaEstado tipo="aviso">
              {ETIQUETA_FUENTE[publicacion.fuente] ?? publicacion.fuente}
            </EtiquetaEstado>
            <span className="text-xs text-texto-3">
              {ETIQUETAS_TIPO[publicacion.tipo] ?? publicacion.tipo}
            </span>
          </div>

          <span className="font-medium text-texto">{publicacion.titulo}</span>
          <span className="text-xs text-texto-3">{publicacion.autoresTexto}</span>
          {publicacion.revistaEditorial && (
            <span className="text-xs text-texto-2">{publicacion.revistaEditorial}</span>
          )}

          {/* En celular, muestra el profesor asignado y año/DOI */}
          <div className="flex flex-wrap items-center gap-2 pt-1 sm:hidden text-xs text-texto-3">
            <span className="font-medium text-texto-2">{publicacion.profesorNombre}</span>
            {publicacion.doi && <span className="font-mono">{publicacion.doi}</span>}
            {publicacion.fechaPublicacion && (
              <span>{new Date(publicacion.fechaPublicacion).getFullYear()}</span>
            )}
          </div>
        </div>
      </td>

      <td className={`${claseTabla.celda} hidden sm:table-cell`}>
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="font-medium">{publicacion.profesorNombre}</span>
          {publicacion.doi && <span className="font-mono text-texto-3">{publicacion.doi}</span>}
          {publicacion.fechaPublicacion && (
            <span className="text-texto-3">
              {new Date(publicacion.fechaPublicacion).getFullYear()}
            </span>
          )}
        </div>
      </td>

      <td className={`${claseTabla.celda} text-right pr-0 whitespace-nowrap`}>
        <div className="flex items-center justify-end gap-1 flex-wrap">
          {/* RF-024 / RF-025: Acción 1: Confirmar autoría */}
          <form action={confirmarAutoria}>
            <input type="hidden" name="publicacionId" value={publicacion.id} />
            <input type="hidden" name="profesorId" value={publicacion.profesorId} />
            <button
              type="submit"
              title="Confirmar autoría e incorporar al conteo oficial"
              className={claseAccionFila(false)}
            >
              Confirmar autoría
            </button>
          </form>

          {/* RF-024: Acción 2: Editar metadatos */}
          <button
            type="button"
            onClick={() => setEditando(true)}
            title="Editar metadatos antes de confirmar"
            className={claseAccionFila(false)}
          >
            Editar
          </button>

          {/* RF-024: Acción 3: Rechazar por homónimo */}
          <button
            type="button"
            onClick={() => setConfirmandoRechazo(true)}
            title="Descartar por homónimo"
            className={claseAccionFila(true)}
          >
            Rechazar
          </button>
        </div>
      </td>
    </tr>
  );
}
