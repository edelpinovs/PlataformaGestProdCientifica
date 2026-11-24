"use client";

import { ModalAlta } from "@/components/modal-alta";
import { SelectorProfesor } from "@/components/selector-profesor";
import { claseCampo, claseEtiqueta } from "@/components/ui";
import type { OpcionProfesor } from "@/lib/selectores/profesor";
import { ETIQUETAS_TIPO, TIPOS_PUBLICACION } from "@/modules/validacion/manual";
import { registrarPublicacionManual } from "./actions";

type Props = {
  profesores: OpcionProfesor[];
  profesorPreseleccionadoId?: number;
  esDocente?: boolean;
};

/**
 * RF-023 · CU-012 (D-214, D-215): Registro manual de publicaciones no detectadas
 * por el escaneo automático, presentado en ModalAlta con SelectorProfesor.
 */
export function RegistrarPublicacionModal({
  profesores,
  profesorPreseleccionadoId,
  esDocente = false,
}: Props) {
  return (
    <ModalAlta
      titulo="Registrar publicación manual"
      textoBoton="Registrar publicación"
      descripcion="Da de alta obras no detectadas por los conectores automáticos. Los campos marcados con * son obligatorios."
      accion={registrarPublicacionManual}
    >
      {({ estado, valor, marcarCambios }) => {
        const profesorIdInicial =
          Number(valor("profesorId", String(profesorPreseleccionadoId ?? ""))) ||
          profesorPreseleccionadoId;

        const opcionesProfesor =
          esDocente && profesorPreseleccionadoId
            ? profesores.filter((p) => p.id === profesorPreseleccionadoId)
            : profesores;

        return (
          <div className="flex flex-col gap-4">
            <SelectorProfesor
              etiqueta="Profesor autor *"
              opciones={opcionesProfesor}
              valorInicial={profesorIdInicial}
              alSeleccionar={marcarCambios}
              error={estado.campo === "profesorId" ? estado.error : undefined}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={claseEtiqueta}>
                <span>
                  Tipo de publicación <span aria-hidden className="text-peligro">*</span>
                </span>
                <select
                  id="tipo"
                  name="tipo"
                  required
                  defaultValue={valor("tipo", "ARTICULO")}
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
                  defaultValue={valor("fechaPublicacion")}
                  aria-invalid={estado.campo === "fechaPublicacion"}
                  className={claseCampo(estado.campo === "fechaPublicacion")}
                />
              </label>
            </div>

            <label className={claseEtiqueta}>
              <span>
                Título de la publicación <span aria-hidden className="text-peligro">*</span>
              </span>
              <input
                id="titulo"
                name="titulo"
                type="text"
                required
                minLength={3}
                maxLength={500}
                placeholder="ej. Análisis de algoritmos concurrentes en sistemas distribuidos"
                defaultValue={valor("titulo")}
                aria-invalid={estado.campo === "titulo"}
                className={claseCampo(estado.campo === "titulo")}
              />
            </label>

            <label className={claseEtiqueta}>
              <span>
                Autores (en el orden que aparecen en la obra){" "}
                <span aria-hidden className="text-peligro">*</span>
              </span>
              <input
                id="autoresTexto"
                name="autoresTexto"
                type="text"
                required
                minLength={3}
                maxLength={500}
                placeholder="ej. García, J.; López, M.; Pérez, R."
                defaultValue={valor("autoresTexto")}
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
                  defaultValue={valor("revistaEditorial")}
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
                  defaultValue={valor("isbnIssn")}
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
                  defaultValue={valor("doi")}
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
                  defaultValue={valor("volumen")}
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
                  defaultValue={valor("paginas")}
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
                defaultValue={valor("evidenciaUrl")}
                aria-invalid={estado.campo === "evidenciaUrl"}
                className={claseCampo(estado.campo === "evidenciaUrl")}
              />
            </label>
          </div>
        );
      }}
    </ModalAlta>
  );
}
