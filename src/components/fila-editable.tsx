"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Aviso,
  claseAccionIcono,
  claseBoton,
  claseBotonPeligro,
  claseBotonSecundario,
  claseCampo,
  claseEtiqueta,
  claseTabla,
  Icono,
  ICONOS,
} from "./ui";

// Fila de listado con Editar y Eliminar (regla de AGENTS.md, issue #59).
// La página pasa las celdas, los campos editables y las dos Server Actions; cada acción
// recibe `id` y los campos en el FormData, y redirige al listado cuando sale bien.
// Al editar o confirmar, la fila se abre a todo el ancho para que quepa en celular.

export type EstadoFila = { error?: string; campo?: string; valores?: Record<string, string> };
export type AccionFila = (estado: EstadoFila, formData: FormData) => Promise<EstadoFila>;

export type CampoFila = {
  nombre: string;
  etiqueta: string;
  valor: string;
  maxLength?: number;
  /** "amplio" ocupa el espacio libre; "corto" sirve para claves y nomenclaturas. */
  ancho?: "amplio" | "corto" | "medio";
  /** Si se pasa, el campo es una lista de opciones. */
  opciones?: { valor: string; texto: string }[];
  /** Si es verdadero, el campo puede quedar vacío (identificadores y adscripción opcionales). */
  opcional?: boolean;
  /** Marca de agua del campo, p. ej. el formato de ORCID. */
  placeholder?: string;
  /** Casilla: si está marcada envía "si". */
  tipo?: "casilla";
  /** La casilla solo se puede marcar si este otro campo tiene uno de estos valores. */
  habilitadaPor?: { campo: string; valores: string[] };
  /** Texto corto que se muestra cuando la casilla está deshabilitada. */
  ayuda?: string;
};

type Props = {
  id: number;
  /** Cómo se nombra el registro en botones y mensajes, p. ej. "Doctorado". */
  nombre: string;
  /** Dato que acompaña al nombre al confirmar, p. ej. la clave. */
  detalle?: string;
  celdas: { contenido: React.ReactNode; className?: string }[];
  campos: CampoFila[];
  editar: AccionFila;
  eliminar: AccionFila;
  /** Icono de ojo que abre el detalle. El modal lo arma la página. */
  verDetalle?: { href: string; idFoco: string };
  /** La página pide abrir la edición de esta fila (desde el detalle) sin perder el listado. */
  edicionInicial?: boolean;
  /** URL del listado sin `editar`, para volver a la fila al cancelar esa edición. */
  urlListado?: string;
};

const ANCHO = { amplio: "flex-1 sm:min-w-56", medio: "sm:w-64", corto: "sm:w-40" };

export function FilaEditable(props: Props) {
  const [modo, setModo] = useState<"ver" | "editar" | "eliminar">(props.edicionInicial ? "editar" : "ver");
  const router = useRouter();
  const cerrar = () => {
    setModo("ver");
    if (props.edicionInicial && props.urlListado) router.replace(props.urlListado, { scroll: false });
  };

  // Edición y confirmación se montan de nuevo cada vez, así no arrastran errores anteriores.
  if (modo === "editar") return <Edicion {...props} cerrar={cerrar} />;
  if (modo === "eliminar") return <Confirmacion {...props} cerrar={cerrar} />;

  return (
    <tr className={claseTabla.fila}>
      {props.celdas.map((celda, i) => (
        <td key={i} className={`${claseTabla.celda} ${celda.className ?? ""}`}>{celda.contenido}</td>
      ))}
      <td className={`${claseTabla.celda} pr-0 text-right whitespace-nowrap`}>
        {props.verDetalle && (
          <Link id={props.verDetalle.idFoco} href={props.verDetalle.href} scroll={false} className={claseAccionIcono()}
            aria-label={`Ver detalle de ${props.nombre}`} title="Ver detalle">
            <Icono d={ICONOS.ver} />
          </Link>
        )}
        <button type="button" onClick={() => setModo("editar")} className={claseAccionIcono()}
          aria-label={`Editar ${props.nombre}`} title="Editar">
          <Icono d={ICONOS.editar} />
        </button>
        <button type="button" onClick={() => setModo("eliminar")} className={claseAccionIcono(true)}
          aria-label={`Eliminar ${props.nombre}`} title="Eliminar">
          <Icono d={ICONOS.eliminar} />
        </button>
      </td>
    </tr>
  );
}

function Edicion({ id, celdas, campos, editar, cerrar }: Props & { cerrar: () => void }) {
  const [estado, accion, guardando] = useActionState<EstadoFila, FormData>(editar, {});
  const [vigentes, setVigentes] = useState<Record<string, string>>({});
  const hayCasilla = campos.some((campo) => campo.tipo === "casilla");

  const leer = (nombre: string, inicial: string) =>
    nombre in vigentes ? vigentes[nombre] : (estado.valores?.[nombre] ?? inicial);
  const cambiar = (nombre: string, valor: string) => setVigentes((prev) => ({ ...prev, [nombre]: valor }));

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={celdas.length + 1} className="py-3">
        <form action={accion} noValidate className="flex flex-col gap-3 rounded-xl bg-superficie-alt p-4">
          <input type="hidden" name="id" value={id} />
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            {campos.map((campo, i) => {
              const conError = estado.campo === campo.nombre;
              const valor = estado.valores?.[campo.nombre] ?? campo.valor;
              if (campo.tipo === "casilla") {
                const origen = campo.habilitadaPor
                  ? leer(
                    campo.habilitadaPor.campo,
                    campos.find((otro) => otro.nombre === campo.habilitadaPor?.campo)?.valor ?? "",
                  )
                  : "";
                const habilitada = !campo.habilitadaPor || campo.habilitadaPor.valores.includes(origen);
                const marcada = habilitada && leer(campo.nombre, campo.valor) === "si";
                return (
                  <label key={campo.nombre} className="flex items-center gap-2 text-sm text-texto-2 sm:self-center">
                    <input type="checkbox" name={campo.nombre} value="si" checked={marcada} disabled={!habilitada}
                      onChange={(e) => cambiar(campo.nombre, e.target.checked ? "si" : "")}
                      aria-invalid={conError} className="accent-[var(--marca)]" />
                    <span>
                      {campo.etiqueta}
                      {!habilitada && campo.ayuda && (
                        <span className="mt-0.5 block text-xs font-normal text-texto-3">{campo.ayuda}</span>
                      )}
                    </span>
                  </label>
                );
              }
              return (
                <label key={campo.nombre} className={`${claseEtiqueta} ${ANCHO[campo.ancho ?? "amplio"]}`}>
                  {campo.etiqueta}
                  {campo.opciones ? (
                    <select name={campo.nombre} required={!campo.opcional}
                      {...(hayCasilla
                        ? { value: leer(campo.nombre, campo.valor), onChange: (e: React.ChangeEvent<HTMLSelectElement>) => cambiar(campo.nombre, e.target.value) }
                        : { defaultValue: valor })}
                      aria-invalid={conError} className={claseCampo(conError)} autoFocus={i === 0}>
                      {campo.opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                    </select>
                  ) : (
                    <input name={campo.nombre} required={!campo.opcional} maxLength={campo.maxLength}
                      placeholder={campo.placeholder} defaultValue={valor} aria-invalid={conError}
                      className={claseCampo(conError)} autoFocus={i === 0} />
                  )}
                </label>
              );
            })}
            <div className="flex gap-2">
              <button type="submit" disabled={guardando} className={claseBoton}>
                {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button type="button" onClick={cerrar} className={claseBotonSecundario}>Cancelar</button>
            </div>
          </div>
          {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        </form>
      </td>
    </tr>
  );
}

function Confirmacion({ id, nombre, detalle, celdas, eliminar, cerrar }: Props & { cerrar: () => void }) {
  const [estado, accion, eliminando] = useActionState<EstadoFila, FormData>(eliminar, {});

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={celdas.length + 1} className="py-3">
        <form action={accion} noValidate className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4">
          <input type="hidden" name="id" value={id} />
          {estado.error ? (
            <Aviso tipo="error">{estado.error}</Aviso>
          ) : (
            <p className="text-sm text-texto">
              ¿Eliminar <strong>«{nombre}»</strong>{detalle ? ` (${detalle})` : ""}? Esta acción no se puede deshacer.
            </p>
          )}
          <div className="flex gap-2">
            {!estado.error && (
              <button type="submit" disabled={eliminando} className={claseBotonPeligro}>
                {eliminando ? "Eliminando…" : "Eliminar"}
              </button>
            )}
            <button type="button" onClick={cerrar} className={claseBotonSecundario} autoFocus>
              {estado.error ? "Cerrar" : "Cancelar"}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
