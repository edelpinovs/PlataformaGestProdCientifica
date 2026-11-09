"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { FUENTES_ANTERIORES, FUENTES_ESCANEO, NOMBRES_FUENTE, type FuenteEscaneo } from "@/modules/produccion/fuentes";
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
  fuentesTrabajo,
  profesorTrabajo,
  anioTrabajo,
}: {
  profesores: { id: number; nombres: string; apellidos: string }[];
  trabajoPendiente?: number;
  fuentesTrabajo?: FuenteEscaneo[];
  profesorTrabajo?: string;
  anioTrabajo?: number;
}) {
  const [estado, formAction] = useActionState<EstadoEscaneo, FormData>(
    async (anterior,datos) => ({ ...await iniciarEscaneoAction(anterior,datos), intento: (anterior.intento ?? 0) + 1 }),
    trabajoPendiente ? { jobId: trabajoPendiente, continuar: true, fuentes: fuentesTrabajo ?? [...FUENTES_ANTERIORES] } : {},
  );
  const [fuentes, elegirFuentes] = useState<FuenteEscaneo[]>(trabajoPendiente ? fuentesTrabajo ?? [...FUENTES_ANTERIORES] : [...FUENTES_ESCANEO]);
  const [profesorElegido, elegirProfesor] = useState(profesorTrabajo ?? "todos");
  const [anioElegido, elegirAnio] = useState(anioTrabajo ? String(anioTrabajo) : "");
  const fuentesMostradas = estado.pendiente || estado.continuar ? estado.fuentes ?? fuentes : fuentes;

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
    <form key={estado.intento ?? 0} action={formAction} className="flex flex-col gap-4">
      {(estado.pendiente || estado.continuar) && estado.jobId && <input type="hidden" name="jobId" value={estado.jobId} />}
      <fieldset disabled={estado.pendiente || estado.continuar} className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold">Fuentes de búsqueda</legend>
        <div className="flex flex-wrap gap-4">{FUENTES_ESCANEO.map(fuente => <label key={fuente} className="flex items-center gap-2 text-sm text-texto-2"><input type="checkbox" name="fuentes" value={fuente} checked={fuentesMostradas.includes(fuente)} onChange={evento => { const marcada=evento.target.checked; elegirFuentes(actual => marcada ? [...actual,fuente] : actual.filter(f => f !== fuente)); }} aria-invalid={Boolean(estado.erroresCampos?.fuentes)} />{NOMBRES_FUENTE[fuente]}</label>)}</div>
        <div><button type="button" className="rounded-xl px-3 py-2 text-sm text-marca hover:bg-hover" onClick={() => elegirFuentes([...FUENTES_ESCANEO])}>Seleccionar todas</button></div>
        <p className="text-sm text-texto-3">Se consultarán únicamente las fuentes elegidas. Google Scholar está sujeto a la cuota del proveedor. Al continuar un trabajo se respetan sus fuentes guardadas.</p>
      </fieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Profesor
          <select name="profesorId" value={profesorElegido} onChange={evento => elegirProfesor(evento.target.value)} disabled={estado.pendiente || estado.continuar}
            aria-invalid={Boolean(estado.erroresCampos?.profesorId)}
            className={claseCampo(Boolean(estado.erroresCampos?.profesorId))}>
            <option value="todos">Todos los profesores activos</option>
            {profesorElegido !== "todos" && !profesores.some(p => String(p.id) === profesorElegido) && <option value={profesorElegido}>Profesor del trabajo #{profesorElegido}</option>}
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
            value={anioElegido}
            onChange={evento => elegirAnio(evento.target.value)}
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
