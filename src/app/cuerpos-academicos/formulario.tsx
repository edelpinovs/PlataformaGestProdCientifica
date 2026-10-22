"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { ETIQUETA_NIVEL, NIVELES_CONSOLIDACION } from "@/modules/cuerpos-academicos/cuerpo";
import { registrarCuerpo, type EstadoCuerpo, type ValoresCuerpo } from "./actions";

type Opcion = { id: number; nombre: string; nomenclatura: string };

const anioActual = String(new Date().getFullYear());

function CamposCuerpo({
  valores,
  campo,
  departamentos,
}: {
  valores?: ValoresCuerpo;
  campo?: EstadoCuerpo["campo"];
  departamentos: Opcion[];
}) {
  const clase = (nombre: EstadoCuerpo["campo"]) => claseCampo(campo === nombre);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <label className={`${claseEtiqueta} sm:w-40`}>
        Clave
        <input name="clave" required maxLength={20} placeholder="CA-001"
          defaultValue={valores?.clave}
          aria-invalid={campo === "clave"} className={clase("clave")} />
      </label>
      <label className={`${claseEtiqueta} flex-1 sm:min-w-56`}>
        Nombre
        <input name="nombre" required maxLength={200} placeholder="Cuerpo Académico de Computación"
          defaultValue={valores?.nombre}
          aria-invalid={campo === "nombre"} className={clase("nombre")} />
      </label>
      <label className={`${claseEtiqueta} sm:w-52`}>
        Nivel de consolidación
        <select name="nivel" required defaultValue={valores?.nivel ?? ""}
          aria-invalid={campo === "nivel"} className={clase("nivel")}>
          <option value="" disabled>Elige un nivel</option>
          {NIVELES_CONSOLIDACION.map((nivel) => (
            <option key={nivel} value={nivel}>{ETIQUETA_NIVEL[nivel]}</option>
          ))}
        </select>
      </label>
      <label className={`${claseEtiqueta} flex-1 sm:min-w-48`}>
        Área PRODEP
        <input name="areaProdep" required maxLength={150} placeholder="Ingeniería y Tecnología"
          defaultValue={valores?.areaProdep}
          aria-invalid={campo === "areaProdep"} className={clase("areaProdep")} />
      </label>
      <label className={`${claseEtiqueta} flex-1 sm:min-w-48`}>
        Disciplina
        <input name="disciplina" required maxLength={150} placeholder="Ciencias de la Computación"
          defaultValue={valores?.disciplina}
          aria-invalid={campo === "disciplina"} className={clase("disciplina")} />
      </label>
      <label className={`${claseEtiqueta} sm:w-64`}>
        Departamento
        <select name="departamentoId" required defaultValue={valores?.departamentoId ?? ""}
          aria-invalid={campo === "departamentoId"} className={clase("departamentoId")}>
          <option value="" disabled>Elige un departamento</option>
          {departamentos.map((d) => (
            <option key={d.id} value={d.id}>{d.nombre} ({d.nomenclatura})</option>
          ))}
        </select>
      </label>
      <label className={`${claseEtiqueta} sm:w-36`}>
        Año de registro
        <input name="anioRegistro" required inputMode="numeric" maxLength={4} placeholder={anioActual}
          defaultValue={valores?.anioRegistro ?? anioActual}
          aria-invalid={campo === "anioRegistro"} className={clase("anioRegistro")} />
      </label>
      <label className={`${claseEtiqueta} sm:w-36`}>
        Año de vencimiento
        <input name="anioVencimiento" required inputMode="numeric" maxLength={4} placeholder={String(Number(anioActual) + 3)}
          defaultValue={valores?.anioVencimiento ?? String(Number(anioActual) + 3)}
          aria-invalid={campo === "anioVencimiento"} className={clase("anioVencimiento")} />
      </label>
    </div>
  );
}

export function FormularioCuerpo({ departamentos }: { departamentos: Opcion[] }) {
  const [estado, accion, enviando] = useActionState<EstadoCuerpo, FormData>(registrarCuerpo, {});

  return (
    <form key={estado.registrado ?? "formulario"} action={accion} className="flex flex-col gap-3">
      <CamposCuerpo valores={estado.valores} campo={estado.campo} departamentos={departamentos} />
      <button type="submit" disabled={enviando} className={`${claseBoton} self-start`}>
        {enviando ? "Registrando…" : "Registrar"}
      </button>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.registrado && (
        <Aviso tipo="exito">Se registró «{estado.registrado}».</Aviso>
      )}
    </form>
  );
}

export { CamposCuerpo };
