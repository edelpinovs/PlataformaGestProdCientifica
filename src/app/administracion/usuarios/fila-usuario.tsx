"use client";

import { useActionState, useState } from "react";
import type { AccionFila, EstadoFila } from "@/components/fila-editable";
import { SelectorProfesor } from "@/components/selector-profesor";
import {
  Aviso,
  claseAccionIcono,
  claseBoton,
  claseBotonPeligro,
  claseBotonSecundario,
  claseCampo,
  claseEtiqueta,
  claseTabla,
  EtiquetaEstado,
  Icono,
  ICONOS,
} from "@/components/ui";
import { ETIQUETA_ROL, ROLES, type Rol } from "@/lib/auth/roles";
import type { OpcionProfesor } from "@/lib/selectores/profesor";

// Iconos propios de esta fila (issue 347): desactivar no es borrar, así que no usa el de eliminar.
const ICONO_PAUSA = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M10 9v6M14 9v6";
const ICONO_REACTIVAR = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M10 8.5l5.5 3.5-5.5 3.5z";

// Fila de un usuario con Editar y Desactivar o Reactivar. No usa <FilaEditable> porque el
// identificador es un uuid, hay un selector de profesor y los usuarios no se eliminan: se
// desactivan, para conservar su historial (justificación en el issue 241).

type Props = {
  id: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  profesor: { id: number; nombres: string; apellidos: string; codigo: string } | null;
  /** Fecha de alta ya formateada en el servidor (hora de México). */
  alta: string;
  /** Profesores que se pueden vincular: los que no tienen perfil y el actual de esta fila. */
  opcionesProfesor: OpcionProfesor[];
  /** Es el perfil de quien está en la pantalla: no puede desactivarse a sí mismo. */
  esPropio: boolean;
  editar: AccionFila;
  cambiarEstado: AccionFila;
};

export function FilaUsuario(props: Props) {
  const [modo, setModo] = useState<"ver" | "editar" | "estado">("ver");
  const cerrar = () => setModo("ver");

  if (modo === "editar") return <Edicion {...props} cerrar={cerrar} />;
  if (modo === "estado") return <CambioEstado {...props} cerrar={cerrar} />;

  const { correo, rol, activo, profesor, alta } = props;
  return (
    <tr className={claseTabla.fila}>
      <td className={claseTabla.celda}>
        <span className="block break-all text-texto">{correo}</span>
        {/* En celular las columnas se apilan bajo el correo. */}
        <span className="mt-1 flex flex-col items-start gap-1 text-xs text-texto-3 md:hidden">
          <span>{ETIQUETA_ROL[rol]} · {profesor ? `${profesor.nombres} ${profesor.apellidos}` : "Sin vincular"}</span>
          <span className="flex flex-wrap items-center gap-2">
            <EtiquetaEstado tipo={activo ? "exito" : "aviso"}>{activo ? "Activo" : "Desactivado"}</EtiquetaEstado>
            <span>Alta {alta}</span>
          </span>
        </span>
      </td>
      <td className={`${claseTabla.celda} hidden md:table-cell`}>{ETIQUETA_ROL[rol]}</td>
      <td className={`${claseTabla.celda} hidden md:table-cell`}>
        {profesor ? `${profesor.nombres} ${profesor.apellidos}` : <span className="text-texto-3">Sin vincular</span>}
      </td>
      <td className={`${claseTabla.celda} hidden md:table-cell`}>
        <EtiquetaEstado tipo={activo ? "exito" : "aviso"}>{activo ? "Activo" : "Desactivado"}</EtiquetaEstado>
      </td>
      <td className={`${claseTabla.celda} whitespace-nowrap hidden md:table-cell`}>{alta}</td>
      <td className={`${claseTabla.celda} pr-0 text-right whitespace-nowrap`}>
        <button type="button" onClick={() => setModo("editar")} className={claseAccionIcono()}
          aria-label={`Editar ${correo}`} title="Editar">
          <Icono d={ICONOS.editar} />
        </button>
        <button type="button" onClick={() => setModo("estado")} className={claseAccionIcono()}
          aria-label={`${activo ? "Desactivar" : "Reactivar"} ${correo}`} title={activo ? "Desactivar" : "Reactivar"}>
          <Icono d={activo ? ICONO_PAUSA : ICONO_REACTIVAR} />
        </button>
      </td>
    </tr>
  );
}

function Edicion({ id, correo, rol, profesor, opcionesProfesor, editar, cerrar }: Props & { cerrar: () => void }) {
  const [estado, accion, guardando] = useActionState<EstadoFila, FormData>(editar, {});
  const rolActual = estado.valores?.rol ?? rol;
  const profesorActual = estado.valores ? Number(estado.valores.profesorId) || undefined : profesor?.id;

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={6} className="py-3">
        <form action={accion} className="flex flex-col gap-3 rounded-xl bg-superficie-alt p-4">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-texto-2">Cambios de acceso para <strong className="text-texto">{correo}</strong>.</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
            <label className={`${claseEtiqueta} sm:w-64`}>
              Rol
              <select name="rol" required defaultValue={rolActual} aria-invalid={estado.campo === "rol"}
                className={claseCampo(estado.campo === "rol")} autoFocus>
                {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
              </select>
            </label>
            <div className="flex-1 sm:min-w-72">
              <SelectorProfesor opciones={opcionesProfesor} etiqueta="Profesor vinculado" requerido={false}
                valorInicial={profesorActual} deshabilitado={guardando}
                error={estado.campo === "profesorId" ? estado.error : undefined} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className={claseBoton}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={cerrar} className={claseBotonSecundario}>Cancelar</button>
          </div>
          {estado.error && estado.campo !== "profesorId" && <Aviso tipo="error">{estado.error}</Aviso>}
        </form>
      </td>
    </tr>
  );
}

function CambioEstado({ id, correo, activo, esPropio, cambiarEstado, cerrar }: Props & { cerrar: () => void }) {
  const [estado, accion, enviando] = useActionState<EstadoFila, FormData>(cambiarEstado, {});
  const desactivar = activo;
  // Quien está en la pantalla no puede desactivarse a sí mismo: se avisa antes y no se ofrece el botón.
  const bloqueado = desactivar && esPropio;

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={6} className="py-3">
        <form action={accion} className={`flex flex-col gap-3 rounded-xl p-4 ${desactivar && !bloqueado ? "bg-peligro-suave" : "bg-superficie-alt"}`}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="accion" value={desactivar ? "desactivar" : "reactivar"} />
          {estado.error ? (
            <Aviso tipo="error">{estado.error}</Aviso>
          ) : bloqueado ? (
            <Aviso tipo="aviso">No puedes desactivar tu propio acceso. Pídeselo a otro administrador.</Aviso>
          ) : desactivar ? (
            <p className="text-sm text-texto">
              ¿Desactivar el acceso de <strong>«{correo}»</strong>? No podrá iniciar sesión, pero sus registros se conservan y puedes reactivarlo cuando quieras.
            </p>
          ) : (
            <p className="text-sm text-texto">¿Reactivar el acceso de <strong>«{correo}»</strong>?</p>
          )}
          <div className="flex gap-2">
            {!estado.error && !bloqueado && (
              <button type="submit" disabled={enviando} className={desactivar ? claseBotonPeligro : claseBoton}>
                {enviando ? "Guardando…" : desactivar ? "Desactivar" : "Reactivar"}
              </button>
            )}
            <button type="button" onClick={cerrar} className={claseBotonSecundario}>
              {estado.error || bloqueado ? "Cerrar" : "Cancelar"}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
