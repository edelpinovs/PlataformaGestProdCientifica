"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { iniciarEscaneoAction, type EstadoEscaneo } from "./actions";
import { ResultadoEscaneo } from "./resultado-escaneo";

function BotonEscanear({ enCurso, continuar }: { enCurso: boolean; continuar: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || enCurso} className={claseBoton}>
      {pending || enCurso ? "Escaneo en curso…" : continuar ? "Continuar búsqueda pendiente" : "Buscar novedades"}
    </button>
  );
}

export function FormularioEscaneo({
  profesores,
  trabajoPendiente,
}: {
  profesores: { id: number; nombres: string; apellidos: string }[];
  trabajoPendiente?: number;
}) {
  const [estado, formAction] = useActionState<EstadoEscaneo, FormData>(
    iniciarEscaneoAction,
    trabajoPendiente ? { jobId: trabajoPendiente, continuar: true } : {},
  );

  useEffect(() => {
    if (!estado.pendiente || !estado.jobId) return;
    const temporizador = setTimeout(() => {
      const datos = new FormData();
      datos.set("jobId", String(estado.jobId));
      startTransition(() => formAction(datos));
    }, 3000);
    return () => clearTimeout(temporizador);
  }, [estado, formAction]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {(estado.pendiente || estado.continuar) && estado.jobId && <input type="hidden" name="jobId" value={estado.jobId} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Profesor
          <select name="profesorId" defaultValue="todos" disabled={estado.pendiente || estado.continuar}
            aria-invalid={Boolean(estado.erroresCampos?.profesorId)}
            className={claseCampo(Boolean(estado.erroresCampos?.profesorId))}>
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
            max={new Date().getUTCFullYear() + 1}
            disabled={estado.pendiente || estado.continuar}
            aria-invalid={Boolean(estado.erroresCampos?.anio)}
            placeholder="Vacío para historial inicial o actualización"
            className={claseCampo(Boolean(estado.erroresCampos?.anio))}
          />
        </label>
      </div>

      <p className="text-sm text-texto-3">Sin año, ORCID y OpenAlex recuperan el historial si no existe un escaneo previo; después consultan novedades. Para revisar un año concreto, indícalo arriba.</p>

      {estado.error && !estado.resultado && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.resultado && <ResultadoEscaneo resultado={estado.resultado} />}
      {estado.pendiente && (
        <div role="status" className="text-sm text-texto-3">
          <p>{estado.mensaje ?? "Recuperando el avance del escaneo..."}</p>
          <p>El avance se guarda por profesor. Puedes volver a esta pantalla para continuar.</p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <BotonEscanear enCurso={Boolean(estado.pendiente)} continuar={Boolean(estado.continuar)} />
      </div>
    </form>
  );
}
