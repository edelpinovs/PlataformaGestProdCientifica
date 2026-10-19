"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  Aviso,
  claseBoton,
  claseBotonSecundario,
  claseCampo,
  claseEtiqueta,
  Icono,
  Panel,
} from "@/components/ui";
import { subirResultados, type EstadoCarga } from "./actions";

const ICONO_SUBIR = "M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12";
const ICONO_ARCHIVO = "M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.5L19 7.5V19a2 2 0 0 1-2 2z";
const ICONO_CHECK = "M5 13l4 4L19 7";

export default function FormCarga() {
  const anioActual = new Date().getFullYear();
  const [estado, accion, enviando] = useActionState<EstadoCarga, FormData>(subirResultados, {});

  const [programa, setPrograma] = useState<"SNII" | "PRODEP">("SNII");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  function formatearTamano(bytes: number) {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function manejarArchivos(lista: FileList | null) {
    if (lista && lista[0]) {
      setArchivo(lista[0]);
    }
  }

  return (
    <Panel
      titulo="Formulario de ingesta"
      descripcion="Carga el archivo oficial de resultados publicado por la institución (CU-010 / RF-016)"
    >
      <form action={accion} className="space-y-6">
        <div>
          <span className="block text-sm font-medium text-texto-2 mb-2">
            Programa de la convocatoria
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                programa === "SNII"
                  ? "border-marca bg-marca-suave"
                  : "border-linea bg-superficie hover:bg-hover"
              }`}
            >
              <input
                type="radio"
                name="programa"
                value="SNII"
                checked={programa === "SNII"}
                onChange={() => setPrograma("SNII")}
                className="mt-1 h-4 w-4 accent-[var(--marca)]"
              />
              <div className="text-sm">
                <span className="block font-semibold text-texto">SNII</span>
                <span className="text-xs text-texto-3">
                  Sistema Nacional de Investigadoras e Investigadores
                </span>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                programa === "PRODEP"
                  ? "border-marca bg-marca-suave"
                  : "border-linea bg-superficie hover:bg-hover"
              }`}
            >
              <input
                type="radio"
                name="programa"
                value="PRODEP"
                checked={programa === "PRODEP"}
                onChange={() => setPrograma("PRODEP")}
                className="mt-1 h-4 w-4 accent-[var(--marca)]"
              />
              <div className="text-sm">
                <span className="block font-semibold text-texto">PRODEP</span>
                <span className="text-xs text-texto-3">
                  Programa para el Desarrollo Profesional Docente
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className={claseEtiqueta}>
            Año de la convocatoria
            <input
              name="anio"
              type="number"
              defaultValue={anioActual}
              min={2000}
              max={anioActual + 1}
              className={claseCampo()}
              required
            />
            <span className="text-xs text-texto-3">
              Año oficial al que corresponden los resultados publicados.
            </span>
          </label>
        </div>

        <div>
          <span className="block text-sm font-medium text-texto-2 mb-1.5">
            Documento oficial de resultados
          </span>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              manejarArchivos(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              arrastrando
                ? "border-marca bg-marca-suave"
                : "border-linea bg-superficie-alt hover:border-marca"
            }`}
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-marca-tenue text-marca mb-3">
              <Icono d={ICONO_SUBIR} />
            </div>

            {archivo ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl bg-superficie px-3.5 py-2 border border-linea">
                  <Icono d={ICONO_ARCHIVO} />
                  <span className="text-sm font-medium text-texto">{archivo.name}</span>
                  <span className="text-xs font-mono text-texto-3">
                    ({formatearTamano(archivo.size)})
                  </span>
                </div>
                <label
                  htmlFor="archivo-input"
                  className="cursor-pointer text-xs font-medium text-marca hover:underline"
                >
                  Cambiar archivo
                </label>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-texto">
                  <label
                    htmlFor="archivo-input"
                    className="cursor-pointer text-marca hover:underline"
                  >
                    Selecciona un archivo
                  </label>{" "}
                  o arrástralo aquí
                </p>
                <p className="text-xs text-texto-3">
                  Formatos admitidos: PDF (.pdf) y Excel (.xlsx) de hasta 50 MB.
                </p>
              </div>
            )}

            <input
              id="archivo-input"
              name="archivo"
              type="file"
              accept=".pdf,.xlsx"
              className="sr-only"
              onChange={(e) => manejarArchivos(e.target.files)}
            />
          </div>

          {archivo && archivo.size > 10 * 1024 * 1024 && (
            <p className="mt-2 text-xs text-texto-3">
              Documento extenso ({formatearTamano(archivo.size)}). Se guardará en Storage y
              se encolará para procesamiento asíncrono.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-linea pt-4">
          <Link href="/convocatorias" className={claseBotonSecundario}>
            Cancelar
          </Link>
          <button type="submit" disabled={enviando || !archivo} className={claseBoton}>
            {enviando ? "Guardando en Storage…" : "Cargar archivo oficial"}
          </button>
        </div>

        {estado?.errors && (
          <div className="grid gap-2">
            {estado.errors.map((e, i) => (
              <Aviso key={i} tipo="error">
                {e}
              </Aviso>
            ))}
          </div>
        )}

        {estado?.ok && (
          <div className="flex flex-col gap-3">
            <Aviso tipo="exito">
              <span className="flex items-center gap-2">
                <Icono d={ICONO_CHECK} />
                <span>
                  Archivo cargado correctamente y registrado para procesamiento.
                </span>
              </span>
            </Aviso>
            <div className="rounded-xl bg-superficie-alt p-3 text-xs text-texto-3 font-mono">
              Ruta en Storage: {estado.ruta}
            </div>
            <div className="flex justify-end">
              <Link href="/convocatorias" className={claseBoton}>
                Volver al listado
              </Link>
            </div>
          </div>
        )}
      </form>
    </Panel>
  );
}
