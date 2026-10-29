"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseBotonSecundario, claseCampo, claseEtiqueta } from "@/components/ui";
import Link from "next/link";
import { crearProfesor, type EstadoProfesor } from "../actions";

type Props = {
  grados: { id: number; nombre: string; nomenclatura: string }[];
  departamentos: { id: number; nombre: string }[];
};

export function FormularioProfesor({ grados, departamentos }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoProfesor, FormData>(crearProfesor, {});

  const v = estado.valores ?? {};
  const err = (campo: string) => estado.campo === campo;

  return (
    <form key={estado.registrado ?? "formulario"} action={accion} className="flex flex-col gap-6">
      {/* ── Datos personales ───────────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold text-texto-2">Datos personales</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            Nombres <span aria-hidden className="text-peligro">*</span>
            <input
              id="nombres"
              name="nombres"
              required
              maxLength={150}
              placeholder="Ej. María José"
              defaultValue={v.nombres}
              aria-invalid={err("nombres")}
              className={claseCampo(err("nombres"))}
            />
          </label>

          <label className={claseEtiqueta}>
            Apellidos <span aria-hidden className="text-peligro">*</span>
            <input
              id="apellidos"
              name="apellidos"
              required
              maxLength={150}
              placeholder="Ej. García López"
              defaultValue={v.apellidos}
              aria-invalid={err("apellidos")}
              className={claseCampo(err("apellidos"))}
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className={claseEtiqueta}>
            Género <span aria-hidden className="text-peligro">*</span>
          </span>
          <div className="flex gap-6">
            {(
              [
                { valor: "M", texto: "Masculino" },
                { valor: "F", texto: "Femenino" },
              ] as const
            ).map(({ valor, texto }) => (
              <label key={valor} className="flex cursor-pointer items-center gap-2 text-sm text-texto-2">
                <input
                  type="radio"
                  name="genero"
                  value={valor}
                  defaultChecked={v.genero === valor}
                  required
                  className="accent-[var(--marca)]"
                />
                {texto}
              </label>
            ))}
          </div>
          {err("genero") && estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        </div>
      </fieldset>

      {/* ── Datos institucionales ──────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold text-texto-2">Datos institucionales</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            Código CUValles <span aria-hidden className="text-peligro">*</span>
            <input
              id="codigo"
              name="codigo"
              required
              maxLength={20}
              placeholder="Ej. GALO1234"
              defaultValue={v.codigo}
              aria-invalid={err("codigo")}
              className={claseCampo(err("codigo"))}
            />
          </label>

          <label className={claseEtiqueta}>
            Correo institucional <span aria-hidden className="text-peligro">*</span>
            <input
              id="correo"
              name="correo"
              type="email"
              required
              maxLength={200}
              placeholder="correo@cuvalles.udg.mx"
              defaultValue={v.correo}
              aria-invalid={err("correo")}
              className={claseCampo(err("correo"))}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            Tipo de contratación <span aria-hidden className="text-peligro">*</span>
            <select
              id="tipoContratacion"
              name="tipoContratacion"
              required
              defaultValue={v.tipoContratacion ?? ""}
              aria-invalid={err("tipoContratacion")}
              className={claseCampo(err("tipoContratacion"))}
            >
              <option value="" disabled>
                — Selecciona —
              </option>
              <option value="TIEMPO_COMPLETO">Tiempo completo</option>
              <option value="ASIGNATURA">Asignatura</option>
            </select>
          </label>

          <label className={claseEtiqueta}>
            Estatus laboral
            <select
              id="estatusLaboral"
              name="estatusLaboral"
              defaultValue={v.estatusLaboral ?? "ACTIVO"}
              className={claseCampo()}
            >
              <option value="ACTIVO">Activo</option>
              <option value="LICENCIA">Licencia</option>
              <option value="BAJA_TEMPORAL">Baja temporal</option>
              <option value="BAJA_POSDOCTORAL">Baja posdoctoral</option>
              <option value="TRASLADADO">Trasladado</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            Departamento
            <select
              id="departamentoId"
              name="departamentoId"
              defaultValue={v.departamentoId ?? ""}
              aria-invalid={err("departamentoId")}
              className={claseCampo(err("departamentoId"))}
            >
              <option value="">— Sin asignar —</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className={claseEtiqueta}>
            Grado científico
            <select
              id="gradoId"
              name="gradoId"
              defaultValue={v.gradoId ?? ""}
              aria-invalid={err("gradoId")}
              className={claseCampo(err("gradoId"))}
            >
              <option value="">— Sin especificar —</option>
              {grados.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre} ({g.nomenclatura})
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {/* ── Identificadores académicos ─────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold text-texto-2">
          Identificadores académicos{" "}
          <span className="font-normal text-texto-3">(opcionales)</span>
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            CVU (CONACYT)
            <input
              id="cvu"
              name="cvu"
              maxLength={20}
              placeholder="Ej. 123456"
              defaultValue={v.cvu}
              aria-invalid={err("cvu")}
              className={claseCampo(err("cvu"))}
            />
          </label>

          <label className={claseEtiqueta}>
            ORCID
            <input
              id="orcid"
              name="orcid"
              maxLength={20}
              placeholder="0000-0000-0000-0000"
              defaultValue={v.orcid}
              aria-invalid={err("orcid")}
              className={claseCampo(err("orcid"))}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            Scholar ID
            <input
              id="scholarId"
              name="scholarId"
              maxLength={50}
              placeholder="Ej. abc123def456"
              defaultValue={v.scholarId}
              aria-invalid={err("scholarId")}
              className={claseCampo(err("scholarId"))}
            />
          </label>

          <label className={claseEtiqueta}>
            Scopus ID
            <input
              id="scopusId"
              name="scopusId"
              maxLength={20}
              placeholder="Ej. 57204190023"
              defaultValue={v.scopusId}
              aria-invalid={err("scopusId")}
              className={claseCampo(err("scopusId"))}
            />
          </label>
        </div>
      </fieldset>

      {/* ── Mensajes de resultado ──────────────────────────── */}
      {estado.error && !err("genero") && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.registrado && (
        <Aviso tipo="exito">
          Se registró a <strong>{estado.registrado}</strong> correctamente.
        </Aviso>
      )}

      {/* ── Acciones ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando} className={claseBoton}>
          {enviando ? "Registrando…" : "Registrar profesor"}
        </button>
        <Link href="/profesores" className={claseBotonSecundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
