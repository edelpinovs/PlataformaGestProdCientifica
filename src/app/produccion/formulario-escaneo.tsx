"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { FUENTES_ANTERIORES, FUENTES_ESCANEO, FUENTES_POR_OMISION, NOMBRES_FUENTE, type FuenteEscaneo } from "@/modules/produccion/fuentes";
import { useFormStatus } from "react-dom";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { iniciarEscaneoAction, type EstadoEscaneo } from "./actions";
import { ResultadoEscaneo } from "./resultado-escaneo";
import { SelectorProfesor } from "@/components/selector-profesor";
import { ANIO_MINIMO_ESCANEO, MAXIMO_ANIOS_RANGO, type RangoEscaneo } from "@/modules/produccion/rango-escaneo";
import { resumenBusqueda } from "@/modules/produccion/resumen-busqueda";

function BotonEscanear({ enCurso, continuar, periodo }: { enCurso: boolean; continuar: boolean; periodo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || enCurso} className={`${claseBoton} shrink-0`}>
      {pending || enCurso ? "Escaneo en curso…" : continuar ? "Continuar búsqueda pendiente" : periodo ? "Buscar en el periodo" : "Buscar novedades"}
    </button>
  );
}

/** Título de cada paso del formulario, con su número para leerlo en orden. */
function TituloPaso({ numero, children }: { numero: number; children: React.ReactNode }) {
  return <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-texto">
    <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-marca-suave text-xs text-marca">{numero}</span>
    {children}
  </legend>;
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
  const desdeMostrado = bloqueado ? rangoGuardado?.desde ?? "" : desdeElegido;
  const hastaMostrado = bloqueado ? rangoGuardado?.hasta ?? "" : hastaElegido;
  const profesorDeLista = profesores.find(profesor => String(profesor.id) === profesorElegido);
  const nombreElegido = profesorElegido === "todos" ? "todos"
    : profesorDeLista ? `${profesorDeLista.apellidos}, ${profesorDeLista.nombres} · ${profesorDeLista.codigo}`
      : profesorElegido ? `el profesor del trabajo #${profesorElegido}` : "";

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
        <fieldset disabled={estado.pendiente || estado.continuar} className="flex flex-col gap-3">
          <TituloPaso numero={1}>¿Dónde buscar?</TituloPaso>
          <div className="flex flex-wrap items-center gap-2">
            {FUENTES_ESCANEO.map(fuente => <label key={fuente} className="flex cursor-pointer items-center gap-2 rounded-xl border border-linea px-3 py-2 text-sm text-texto-2 hover:bg-hover has-[:checked]:border-marca has-[:checked]:bg-marca-suave has-[:checked]:text-texto">
              <input type="checkbox" name="fuentes" value={fuente} checked={fuentesMostradas.includes(fuente)} onChange={evento => { const marcada=evento.target.checked; elegirFuentes(actual => marcada ? [...actual,fuente] : actual.filter(f => f !== fuente)); }} aria-invalid={Boolean(estado.erroresCampos?.fuentes)} />
              {NOMBRES_FUENTE[fuente]}
            </label>)}
            {!bloqueado && <button type="button" className="rounded-xl px-1 py-2 text-sm font-medium text-marca underline-offset-4 hover:underline" onClick={() => elegirFuentes([...FUENTES_ESCANEO])}>Seleccionar todas</button>}
          </div>
          <p className="text-xs text-texto-3">{bloqueado ? "Se conservan las fuentes del trabajo pendiente." : "Crossref y Google Scholar son opcionales; Google Scholar tiene una cuota limitada de consultas."}</p>
          <div className="flex flex-col gap-1 rounded-xl bg-superficie-alt p-3">
            <label className="flex items-center gap-2 text-sm text-texto-2">
              <input type="checkbox" name="enriquecerAutores" value="si" checked={enriquecerMostrado} onChange={evento => elegirEnriquecer(evento.target.checked)} aria-invalid={Boolean(estado.erroresCampos?.enriquecerAutores)} />
              Completar coautores con Crossref
            </label>
            <p className="pl-6 text-xs text-texto-3">Scopus solo entrega el primer autor. Esta opción busca los demás por DOI, aunque Crossref no esté marcado arriba.</p>
          </div>
        </fieldset>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <fieldset disabled={estado.pendiente || estado.continuar} className="flex min-w-0 flex-col gap-3">
            <TituloPaso numero={2}>¿De quién?</TituloPaso>
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

          <fieldset disabled={bloqueado} className="flex min-w-0 flex-col gap-3">
            <TituloPaso numero={3}>¿Qué periodo? <span className="font-normal text-texto-3">(opcional)</span></TituloPaso>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={claseEtiqueta}>
                Desde
                <input
                  type="date"
                  name="desde"
                  value={desdeMostrado}
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
                  value={hastaMostrado}
                  onChange={evento => elegirHasta(evento.target.value)}
                  min={`${ANIO_MINIMO_ESCANEO}-01-01`}
                  disabled={bloqueado}
                  aria-invalid={Boolean(estado.erroresCampos?.hasta)}
                  className={`${claseCampo(Boolean(estado.erroresCampos?.hasta))} w-full min-w-0`}
                />
              </label>
            </div>
            <p className="text-xs text-texto-3">{`Sin fechas, cada fuente sigue desde su última búsqueda; la primera vez trae todo el historial, salvo Scopus, que empieza en el año en curso. Máximo ${MAXIMO_ANIOS_RANGO} años calendario; sin Hasta, se busca hasta hoy. Revisar un periodo no mueve el punto de continuación.`}</p>
            {[estado.erroresCampos?.desde, estado.erroresCampos?.hasta].filter(Boolean).map(mensaje => <Aviso key={mensaje} tipo="error">{mensaje}</Aviso>)}
          </fieldset>
        </div>

        <div className="flex flex-col gap-4 border-t border-linea pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="text-sm text-texto-2">{resumenBusqueda({ fuentes: fuentesMostradas, profesor: nombreElegido, desde: desdeMostrado, hasta: hastaMostrado })}</p>
          <BotonEscanear enCurso={Boolean(estado.pendiente)} continuar={Boolean(estado.continuar)} periodo={Boolean(desdeMostrado)} />
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
