"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { FUENTES_ANTERIORES, FUENTES_ESCANEO, FUENTES_POR_OMISION, NOMBRES_FUENTE, type FuenteEscaneo } from "@/modules/produccion/fuentes";
import { useFormStatus } from "react-dom";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { iniciarEscaneoAction, type EstadoEscaneo } from "./actions";
import { ResultadoEscaneo } from "./resultado-escaneo";
import { SelectorProfesor } from "@/components/selector-profesor";
import { ANIO_MINIMO_ESCANEO, MAXIMO_ANIOS_RANGO, type RangoEscaneo } from "@/modules/produccion/rango-escaneo";

function BotonEscanear({ enCurso, continuar }: { enCurso: boolean; continuar: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || enCurso} className={claseBoton}>
      {pending || enCurso ? "Escaneo en curso…" : continuar ? "Continuar búsqueda pendiente" : "Buscar novedades"}
    </button>
  );
}

function ProgresoEscaneo({ estado, enviando }: { estado: EstadoEscaneo; enviando: boolean }) {
  const enCurso = Boolean(estado.pendiente);
  const finalizado = Boolean(estado.resultado);
  const total = estado.total ?? 0;
  const avance = estado.avance ?? 0;
  const conocido = enCurso || (finalizado && !enviando);
  const visible = enCurso || enviando || finalizado;
  const texto = conocido
    ? `${avance} de ${total} profesores revisados.${estado.fuenteEnCurso ? ` Consultando ${NOMBRES_FUENTE[estado.fuenteEnCurso]}.` : ""}`
    : enviando ? "Iniciando búsqueda…" : "";
  const valor = conocido ? (total === 0 && estado.exito ? 1 : avance) : undefined;

  return <div className={visible ? "flex min-w-0 flex-col gap-2 text-sm text-texto-3" : "sr-only"}>
    {visible && <progress aria-label="Avance de la búsqueda" max={Math.max(total, 1)} value={valor}
      className="h-3 w-full overflow-hidden rounded-full bg-superficie-alt accent-marca [&::-webkit-progress-bar]:bg-superficie-alt [&::-webkit-progress-value]:bg-marca" />}
    <p role="status">{texto}</p>
  </div>;
}

export function FormularioEscaneo({
  profesores,
  trabajoPendiente,
  fuentesTrabajo,
  enriquecerTrabajo,
  profesorTrabajo,
  rangoTrabajo,
}: {
  profesores: { id: number; nombres: string; apellidos: string; codigo: string }[];
  trabajoPendiente?: number;
  fuentesTrabajo?: FuenteEscaneo[];
  enriquecerTrabajo?: boolean;
  profesorTrabajo?: string;
  rangoTrabajo?: RangoEscaneo;
}) {
  const [estado, formAction, enviando] = useActionState<EstadoEscaneo, FormData>(
    async (anterior,datos) => ({ ...await iniciarEscaneoAction(anterior,datos), intento: (anterior.intento ?? 0) + 1 }),
    trabajoPendiente ? { jobId: trabajoPendiente, continuar: true, fuentes: fuentesTrabajo ?? [...FUENTES_ANTERIORES], enriquecerAutores: enriquecerTrabajo, rango: rangoTrabajo } : {},
  );
  const [fuentes, elegirFuentes] = useState<FuenteEscaneo[]>(trabajoPendiente ? fuentesTrabajo ?? [...FUENTES_ANTERIORES] : [...FUENTES_POR_OMISION]);
  const [enriquecer, elegirEnriquecer] = useState(trabajoPendiente ? enriquecerTrabajo ?? false : true);
  const [profesorElegido, elegirProfesor] = useState(profesorTrabajo ?? "todos");
  const [desdeElegido, elegirDesde] = useState(rangoTrabajo?.desde ?? "");
  const [hastaElegido, elegirHasta] = useState(rangoTrabajo?.hasta ?? "");
  const fuentesMostradas = estado.pendiente || estado.continuar ? estado.fuentes ?? fuentes : fuentes;
  const enriquecerMostrado = estado.pendiente || estado.continuar ? estado.enriquecerAutores ?? enriquecer : enriquecer;
  // Al continuar se muestra el rango guardado en el trabajo, no el que se haya escrito.
  const rangoGuardado = estado.pendiente || estado.continuar ? estado.rango ?? rangoTrabajo : undefined;
  const bloqueado = Boolean(estado.pendiente || estado.continuar);

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
    <div className="flex flex-col gap-4">
      <form key={estado.intento ?? 0} action={formAction} className="flex flex-col gap-4">
        {(estado.pendiente || estado.continuar) && estado.jobId && <input type="hidden" name="jobId" value={estado.jobId} />}
        <fieldset disabled={estado.pendiente || estado.continuar} className="flex flex-col gap-4">
          <legend className="mb-2 text-sm font-semibold">Fuentes de búsqueda</legend>
          <div className="flex flex-wrap gap-4">{FUENTES_ESCANEO.map(fuente => <label key={fuente} className="flex items-center gap-2 text-sm text-texto-2"><input type="checkbox" name="fuentes" value={fuente} checked={fuentesMostradas.includes(fuente)} onChange={evento => { const marcada=evento.target.checked; elegirFuentes(actual => marcada ? [...actual,fuente] : actual.filter(f => f !== fuente)); }} aria-invalid={Boolean(estado.erroresCampos?.fuentes)} />{NOMBRES_FUENTE[fuente]}</label>)}</div>
          <div><button type="button" className="rounded-xl px-3 py-2 text-sm text-marca hover:bg-hover" onClick={() => elegirFuentes([...FUENTES_ESCANEO])}>Seleccionar todas</button></div>
          <p className="text-sm text-texto-3">Se consultarán únicamente las fuentes elegidas. Crossref y Google Scholar son opcionales; Google Scholar está sujeto a la cuota del proveedor. Al continuar un trabajo se respetan sus fuentes guardadas.</p>
          <label className="flex items-center gap-2 text-sm text-texto-2">
            <input type="checkbox" name="enriquecerAutores" value="si" checked={enriquecerMostrado} onChange={evento => elegirEnriquecer(evento.target.checked)} aria-invalid={Boolean(estado.erroresCampos?.enriquecerAutores)} />
            Completar autores por DOI con Crossref
          </label>
          <p className="text-sm text-texto-3">Scopus solo entrega el primer autor: esta opción completa los coautores con Crossref aunque no lo elijas como fuente de obras.</p>
        </fieldset>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <fieldset disabled={estado.pendiente || estado.continuar} className="flex min-w-0 flex-col gap-4">
            <legend className="mb-2 text-sm font-semibold">Profesores de la búsqueda</legend>
            <label className="flex items-center gap-2 text-sm text-texto-2">
              <input type="checkbox" checked={profesorElegido === "todos"}
                onChange={evento => elegirProfesor(evento.target.checked ? "todos" : "")} />
              Todos los profesores activos
            </label>
            {profesorElegido === "todos" ? <input type="hidden" name="profesorId" value="todos" /> :
              (estado.pendiente || estado.continuar) && !profesores.some(profesor => String(profesor.id) === profesorElegido) ?
              <p className="text-sm text-texto-2">Profesor del trabajo #{profesorElegido}. Se conserva la selección original aunque ya no esté activo.</p> :
              <SelectorProfesor opciones={profesores} valorInicial={profesorElegido ? Number(profesorElegido) : undefined}
                alSeleccionar={id => elegirProfesor(id === undefined ? "" : String(id))}
                deshabilitado={Boolean(estado.pendiente || estado.continuar)} error={estado.erroresCampos?.profesorId} />}
            {estado.erroresCampos?.profesorId && profesorElegido === "todos" && <Aviso tipo="error">{estado.erroresCampos.profesorId}</Aviso>}
          </fieldset>

          <fieldset disabled={bloqueado} className="flex min-w-0 flex-col gap-4">
            <legend className="mb-2 text-sm font-semibold">Rango de búsqueda (opcional)</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={claseEtiqueta}>
                Desde
                <input
                  type="date"
                  name="desde"
                  value={bloqueado ? rangoGuardado?.desde ?? "" : desdeElegido}
                  onChange={evento => elegirDesde(evento.target.value)}
                  min={`${ANIO_MINIMO_ESCANEO}-01-01`}
                  disabled={bloqueado}
                  aria-invalid={Boolean(estado.erroresCampos?.desde)}
                  className={`${claseCampo(Boolean(estado.erroresCampos?.desde))} w-full min-w-0`}
                />
              </label>
              <label className={claseEtiqueta}>
                Hasta
                <input
                  type="date"
                  name="hasta"
                  value={bloqueado ? rangoGuardado?.hasta ?? "" : hastaElegido}
                  onChange={evento => elegirHasta(evento.target.value)}
                  min={`${ANIO_MINIMO_ESCANEO}-01-01`}
                  disabled={bloqueado}
                  aria-invalid={Boolean(estado.erroresCampos?.hasta)}
                  className={`${claseCampo(Boolean(estado.erroresCampos?.hasta))} w-full min-w-0`}
                />
              </label>
            </div>
            {[estado.erroresCampos?.desde, estado.erroresCampos?.hasta].filter(Boolean).map(mensaje => <Aviso key={mensaje} tipo="error">{mensaje}</Aviso>)}
          </fieldset>
        </div>

        <p className="text-sm text-texto-3">{`Sin fechas, ORCID y OpenAlex recuperan el historial si no existe un escaneo previo; después consultan novedades. Para revisar un periodo, indica Desde y Hasta (máximo ${MAXIMO_ANIOS_RANGO} años); sin Hasta se busca hasta hoy. Un periodo no adelanta los puntos de continuación.`}</p>

        <div className="flex justify-end pt-2">
          <BotonEscanear enCurso={Boolean(estado.pendiente)} continuar={Boolean(estado.continuar)} />
        </div>
      </form>
      <ProgresoEscaneo estado={estado} enviando={enviando} />
      {estado.error && !estado.resultado && <Aviso tipo="error">{estado.error}</Aviso>}
      {!enviando && estado.resultado && <ResultadoEscaneo resultado={estado.resultado} />}
      {estado.pendiente && (
        <p className="text-sm text-texto-3">El avance se guarda por profesor. Puedes volver a esta pantalla para continuar.</p>
      )}
    </div>
  );
}
