"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { iniciarEscaneoAction, type EstadoEscaneo } from "./actions";

function BotonEscanear() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={claseBoton}>
      {pending ? "Escaneando fuentes externas..." : "Escanear ahora"}
    </button>
  );
}

export function FormularioEscaneo({
  profesores,
}: {
  profesores: { id: number; nombres: string; apellidos: string }[];
}) {
  const [estado, formAction] = useActionState<EstadoEscaneo, FormData>(
    iniciarEscaneoAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Profesor
          <select name="profesorId" defaultValue="todos" className={claseCampo()}>
            <option value="todos">Todos los profesores activos</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.apellidos}, {p.nombres}
              </option>
            ))}
          </select>
        </label>

        <label className={claseEtiqueta}>
          Año de publicación (opcional)
          <input
            type="number"
            name="anio"
            min="1990"
            max="2100"
            placeholder="Ej. 2026 (o vacío para todos)"
            className={claseCampo()}
          />
        </label>
      </div>

      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.exito && estado.mensaje && <Aviso tipo="exito">{estado.mensaje}</Aviso>}

      <div className="flex justify-end pt-2">
        <BotonEscanear />
      </div>
    </form>
  );
}
