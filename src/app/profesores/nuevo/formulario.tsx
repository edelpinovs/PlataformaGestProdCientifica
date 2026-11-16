"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseBotonSecundario } from "@/components/ui";
import Link from "next/link";
import { CamposProfesor } from "../campos-profesor";
import { crearProfesor, type EstadoProfesor } from "../actions";

type Props = {
  grados: { id: number; nombre: string; nomenclatura: string }[];
  departamentos: { id: number; nombre: string }[];
};

export function FormularioProfesor({ grados, departamentos }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoProfesor, FormData>(crearProfesor, {});

  const v = estado.valores ?? {};
  const errorEnGenero = estado.campo === "genero";

  return (
    <form key={estado.registrado ?? "formulario"} action={accion} className="flex flex-col gap-5">
      <CamposProfesor
        grados={grados}
        departamentos={departamentos}
        valor={(nombre) => v[nombre] ?? ""}
        campo={estado.campo}
        errorGenero={errorEnGenero ? estado.error : undefined}
      />

      {/* ── Mensajes de resultado ──────────────────────────── */}
      {estado.error && !errorEnGenero && <Aviso tipo="error">{estado.error}</Aviso>}
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
