"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { registrarLgac, type EstadoLgac } from "./actions";

export type IntegranteLgac = { profesorId: number; nombre: string };

export function CamposLgac({
  integrantes,
  valores,
  campo,
}: {
  integrantes: IntegranteLgac[];
  valores: { nombre: string; descripcion: string; profesorIds: string[] };
  campo?: "nombre" | "descripcion" | "profesorIds";
}) {
  const marcados = new Set(valores.profesorIds);

  return (
    <div className="flex flex-col gap-4">
      <label className={claseEtiqueta}>
        Nombre
        <input name="nombre" required maxLength={200} defaultValue={valores.nombre}
          aria-invalid={campo === "nombre"} className={claseCampo(campo === "nombre")} />
      </label>
      <label className={claseEtiqueta}>
        Descripción (opcional)
        <textarea name="descripcion" maxLength={400} rows={3} defaultValue={valores.descripcion}
          aria-invalid={campo === "descripcion"} className={claseCampo(campo === "descripcion")} />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className={claseEtiqueta}>Integrantes de la línea</legend>
        {integrantes.map((i) => (
          <label key={i.profesorId} className="flex items-center gap-2 text-sm text-texto">
            <input type="checkbox" name="profesorIds" value={i.profesorId}
              defaultChecked={marcados.has(String(i.profesorId))} />
            {i.nombre}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

export function FormularioLgac({
  cuerpoId,
  integrantes,
}: {
  cuerpoId: number;
  integrantes: IntegranteLgac[];
}) {
  const [estado, accion, enviando] = useActionState<EstadoLgac, FormData>(registrarLgac, {});
  const valores = estado.valores ?? { nombre: "", descripcion: "", profesorIds: [] };

  return (
    <form key={estado.registrada ?? estado.error ?? "lgac"} action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="cuerpoId" value={cuerpoId} />
      <CamposLgac integrantes={integrantes} valores={valores} campo={estado.campo} />
      <button type="submit" disabled={enviando} className={`${claseBoton} self-start`}>
        {enviando ? "Registrando…" : "Registrar LGAC"}
      </button>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.registrada && (
        <Aviso tipo="exito">Se registró la LGAC «{estado.registrada}».</Aviso>
      )}
    </form>
  );
}
