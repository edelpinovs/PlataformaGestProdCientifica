"use client";

import { useRef, useState } from "react";
import { claseCampo, claseEtiqueta } from "@/components/ui";
import {
  ETIQUETAS_RESULTADO_PRODEP,
  ETIQUETAS_TIPO_SOLICITUD_PRODEP,
  RESULTADOS_PRODEP,
  TIPOS_SOLICITUD_PRODEP,
} from "@/modules/reconocimientos/prodep";
import { consultarVigenciaProdep, type EstadoProdep, type VigenciaCalculada } from "./actions";

export type ProfesorProdep = {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  tipoContratacion: "TIEMPO_COMPLETO" | "ASIGNATURA";
};

export type ValoresProdep = {
  profesorId: string;
  tipoSolicitud: string;
  resultado: string;
  fechaInicio: string;
  fechaFin: string;
};

type Campos = Pick<ValoresProdep, "profesorId" | "tipoSolicitud" | "resultado" | "fechaInicio">;

export function FormularioProdepCampos({ profesores, valores, estado, excluirId }: {
  profesores: ProfesorProdep[];
  valores?: Partial<ValoresProdep>;
  estado: EstadoProdep;
  /** Al editar, el registro que se edita no cuenta como antecedente de sí mismo. */
  excluirId?: number;
}) {
  const [campos, setCampos] = useState<Campos>({
    profesorId: valores?.profesorId ?? "",
    tipoSolicitud: valores?.tipoSolicitud ?? "",
    resultado: valores?.resultado ?? "",
    fechaInicio: valores?.fechaInicio ?? "",
  });
  const [fechaFin, setFechaFin] = useState(valores?.fechaFin ?? "");
  const [vigencia, setVigencia] = useState<VigenciaCalculada | null>(null);
  const solicitud = useRef(0);

  // La vigencia (3 o 6 años) la calcula el servidor con el historial del profesor; si llegan dos
  // respuestas desordenadas, solo cuenta la de la última solicitud.
  function cambiar(cambio: Partial<Campos>) {
    const siguiente = { ...campos, ...cambio };
    setCampos(siguiente);
    const numero = ++solicitud.current;
    const aplicar = (resultado: VigenciaCalculada | null) => {
      if (numero !== solicitud.current) return;
      setVigencia(resultado);
      setFechaFin(resultado?.fechaFin ?? "");
    };
    if (!siguiente.profesorId || !siguiente.tipoSolicitud || !siguiente.resultado || !siguiente.fechaInicio) {
      aplicar(null);
      return;
    }
    consultarVigenciaProdep({ ...siguiente, profesorId: Number(siguiente.profesorId), excluirId })
      .then(aplicar, () => aplicar(null));
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${claseEtiqueta} min-w-0`}>
          Profesor de Tiempo Completo
          <select name="profesorId" required value={campos.profesorId}
            onChange={(evento) => cambiar({ profesorId: evento.currentTarget.value })}
            aria-invalid={estado.campo === "profesorId"}
            className={`${claseCampo(estado.campo === "profesorId")} min-w-0 w-full`}>
            <option value="" disabled>Selecciona un profesor</option>
            {profesores.map((profesor) => (
              <option key={profesor.id} value={profesor.id}>
                {profesor.apellidos}, {profesor.nombres} ({profesor.codigo})
                {profesor.tipoContratacion === "ASIGNATURA" ? " · Asignatura" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className={`${claseEtiqueta} min-w-0`}>
          Tipo de solicitud
          <select name="tipoSolicitud" required value={campos.tipoSolicitud}
            onChange={(evento) => cambiar({ tipoSolicitud: evento.currentTarget.value })}
            aria-invalid={estado.campo === "tipoSolicitud"}
            className={`${claseCampo(estado.campo === "tipoSolicitud")} min-w-0 w-full`}>
            <option value="" disabled>Selecciona un tipo</option>
            {TIPOS_SOLICITUD_PRODEP.map((tipo) => (
              <option key={tipo} value={tipo}>{ETIQUETAS_TIPO_SOLICITUD_PRODEP[tipo]}</option>
            ))}
          </select>
        </label>
        <label className={`${claseEtiqueta} min-w-0`}>
          Resultado
          <select name="resultado" required value={campos.resultado}
            onChange={(evento) => cambiar({ resultado: evento.currentTarget.value })}
            aria-invalid={estado.campo === "resultado"}
            className={`${claseCampo(estado.campo === "resultado")} min-w-0 w-full`}>
            <option value="" disabled>Selecciona un resultado</option>
            {RESULTADOS_PRODEP.map((resultado) => (
              <option key={resultado} value={resultado}>{ETIQUETAS_RESULTADO_PRODEP[resultado]}</option>
            ))}
          </select>
        </label>
        <label className={`${claseEtiqueta} min-w-0`}>
          Inicio de vigencia
          <input type="date" name="fechaInicio" required value={campos.fechaInicio}
            onChange={(evento) => cambiar({ fechaInicio: evento.currentTarget.value })}
            aria-invalid={estado.campo === "fechaInicio"}
            className={`${claseCampo(estado.campo === "fechaInicio")} min-w-0 w-full`} />
        </label>
        <label className={`${claseEtiqueta} min-w-0`}>
          Fin de vigencia (se calcula solo)
          <input type="date" name="fechaFin" required readOnly value={fechaFin}
            aria-invalid={estado.campo === "fechaFin"}
            className={`${claseCampo(estado.campo === "fechaFin")} min-w-0 w-full`} />
        </label>
      </div>
      {vigencia && <p className="text-xs text-texto-3">{vigencia.texto}</p>}
    </>
  );
}
