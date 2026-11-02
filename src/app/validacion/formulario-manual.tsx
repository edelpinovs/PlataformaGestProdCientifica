"use client";

import { useActionState, useEffect, useRef } from "react";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { ETIQUETAS_TIPO, TIPOS_PUBLICACION } from "@/modules/validacion/manual";
import { registrarPublicacionManual, type EstadoManual } from "./actions";

type ProfesorOpcion = {
  id: number;
  nombres: string;
  apellidos: string;
  codigo: string;
};

type Props = {
  profesores: ProfesorOpcion[];
  profesorPreseleccionadoId?: number;
  esDocente?: boolean;
};

export function FormularioManual({ profesores, profesorPreseleccionadoId, esDocente = false }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoManual, FormData>(
    registrarPublicacionManual,
    {},
  );
  const formularioRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.registrado) {
      formularioRef.current?.reset();
    }
  }, [estado.registrado]);

  return (
    <form ref={formularioRef} action={accion} className="flex flex-col gap-4">
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.registrado && (
        <Aviso tipo="exito">Se registró correctamente «{estado.registrado}».</Aviso>
      )}

      {/* Selección de profesor si no es docente único */}
      {!esDocente && (
        <label className={claseEtiqueta}>
          Profesor autor
          <select
            id="profesorId"
            name="profesorId"
            required
            defaultValue={profesorPreseleccionadoId ?? ""}
            aria-invalid={estado.campo === "profesorId"}
            className={claseCampo(estado.campo === "profesorId")}
          >
            <option value="">Selecciona al profesor…</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.apellidos}, {p.nombres} ({p.codigo})
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Tipo de publicación
          <select
            id="tipo"
            name="tipo"
            required
            defaultValue={estado.valores?.tipo ?? "ARTICULO"}
            aria-invalid={estado.campo === "tipo"}
            className={claseCampo(estado.campo === "tipo")}
          >
            {TIPOS_PUBLICACION.map((t) => (
              <option key={t} value={t}>
                {ETIQUETAS_TIPO[t]}
              </option>
            ))}
          </select>
        </label>

        <label className={claseEtiqueta}>
          Fecha de publicación (opcional)
          <input
            id="fechaPublicacion"
            name="fechaPublicacion"
            type="date"
            defaultValue={estado.valores?.fechaPublicacion ?? ""}
            aria-invalid={estado.campo === "fechaPublicacion"}
            className={claseCampo(estado.campo === "fechaPublicacion")}
          />
        </label>
      </div>

      <label className={claseEtiqueta}>
        Título de la publicación
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          minLength={3}
          maxLength={500}
          placeholder="ej. Análisis de algoritmos concurrentes en sistemas distribuidos"
          defaultValue={estado.valores?.titulo ?? ""}
          aria-invalid={estado.campo === "titulo"}
          className={claseCampo(estado.campo === "titulo")}
        />
      </label>

      <label className={claseEtiqueta}>
        Autores (en el orden que aparecen en la obra)
        <input
          id="autoresTexto"
          name="autoresTexto"
          type="text"
          required
          minLength={3}
          maxLength={500}
          placeholder="ej. García, J.; López, M.; Pérez, R."
          defaultValue={estado.valores?.autoresTexto ?? ""}
          aria-invalid={estado.campo === "autoresTexto"}
          className={claseCampo(estado.campo === "autoresTexto")}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Revista o Editorial (opcional)
          <input
            id="revistaEditorial"
            name="revistaEditorial"
            type="text"
            maxLength={250}
            placeholder="ej. Revista Mexicana de Física / Editorial Trillas"
            defaultValue={estado.valores?.revistaEditorial ?? ""}
            aria-invalid={estado.campo === "revistaEditorial"}
            className={claseCampo(estado.campo === "revistaEditorial")}
          />
        </label>

        <label className={claseEtiqueta}>
          ISBN o ISSN (opcional)
          <input
            id="isbnIssn"
            name="isbnIssn"
            type="text"
            maxLength={50}
            placeholder="ej. 978-3-16-148410-0 o 2049-3630"
            defaultValue={estado.valores?.isbnIssn ?? ""}
            aria-invalid={estado.campo === "isbnIssn"}
            className={claseCampo(estado.campo === "isbnIssn")}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className={claseEtiqueta}>
          DOI (opcional)
          <input
            id="doi"
            name="doi"
            type="text"
            maxLength={100}
            placeholder="ej. 10.1016/j.artint.2026.01.001"
            defaultValue={estado.valores?.doi ?? ""}
            aria-invalid={estado.campo === "doi"}
            className={claseCampo(estado.campo === "doi")}
          />
        </label>

        <label className={claseEtiqueta}>
          Volumen (opcional)
          <input
            id="volumen"
            name="volumen"
            type="text"
            maxLength={50}
            placeholder="ej. Vol. 12"
            defaultValue={estado.valores?.volumen ?? ""}
            aria-invalid={estado.campo === "volumen"}
            className={claseCampo(estado.campo === "volumen")}
          />
        </label>

        <label className={claseEtiqueta}>
          Páginas (opcional)
          <input
            id="paginas"
            name="paginas"
            type="text"
            maxLength={50}
            placeholder="ej. 45-58"
            defaultValue={estado.valores?.paginas ?? ""}
            aria-invalid={estado.campo === "paginas"}
            className={claseCampo(estado.campo === "paginas")}
          />
        </label>
      </div>

      <label className={claseEtiqueta}>
        Enlace de evidencia o comprobante (opcional)
        <input
          id="evidenciaUrl"
          name="evidenciaUrl"
          type="url"
          maxLength={500}
          placeholder="https://repositorio.udg.mx/..."
          defaultValue={estado.valores?.evidenciaUrl ?? ""}
          aria-invalid={estado.campo === "evidenciaUrl"}
          className={claseCampo(estado.campo === "evidenciaUrl")}
        />
      </label>

      <div className="pt-2">
        <button type="submit" disabled={enviando} className={claseBoton}>
          {enviando ? "Guardando…" : "Registrar publicación"}
        </button>
      </div>
    </form>
  );
}
