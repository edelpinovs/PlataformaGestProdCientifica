"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { registrarDepartamento, type EstadoDepartamento } from "./actions";

type Opcion = { id: number; nombre: string; clave: string };

export function FormularioDepartamento({ divisiones }: { divisiones: Opcion[] }) {
  const [estado, accion, enviando] = useActionState<EstadoDepartamento, FormData>(registrarDepartamento, {});
  const clase = (nombre: EstadoDepartamento["campo"]) => claseCampo(estado.campo === nombre);

  return (
    // La key vacía los campos tras un alta y conserva lo escrito si hubo error.
    <form key={estado.registrado ?? "formulario"} action={accion} className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className={`${claseEtiqueta} sm:w-64`}>
          División académica
          <select name="divisionId" required defaultValue={estado.valores?.divisionId ?? ""}
            aria-invalid={estado.campo === "divisionId"} className={clase("divisionId")}>
            <option value="" disabled>Elige una división</option>
            {divisiones.map((d) => (
              <option key={d.id} value={d.id}>{d.nombre} ({d.clave})</option>
            ))}
          </select>
        </label>
        <label className={`${claseEtiqueta} flex-1 sm:min-w-56`}>
          Nombre
          <input name="nombre" required maxLength={150} placeholder="Departamento de Ciencias Exactas"
            defaultValue={estado.valores?.nombre}
            aria-invalid={estado.campo === "nombre"} className={clase("nombre")} />
        </label>
        <label className={`${claseEtiqueta} sm:w-40`}>
          Nomenclatura
          <input name="nomenclatura" required maxLength={20} placeholder="DCE"
            defaultValue={estado.valores?.nomenclatura}
            aria-invalid={estado.campo === "nomenclatura"} className={clase("nomenclatura")} />
        </label>
        <button type="submit" disabled={enviando} className={claseBoton}>
          {enviando ? "Registrando…" : "Registrar"}
        </button>
      </div>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.registrado && (
        <Aviso tipo="exito">Se registró «{estado.registrado}».</Aviso>
      )}
    </form>
  );
}
