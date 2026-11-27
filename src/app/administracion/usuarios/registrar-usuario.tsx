"use client";

import { ModalAlta } from "@/components/modal-alta";
import { SelectorProfesor } from "@/components/selector-profesor";
import { claseCampo, claseEtiqueta } from "@/components/ui";
import { ETIQUETA_ROL, ROLES } from "@/lib/auth/roles";
import type { OpcionProfesor } from "@/lib/selectores/profesor";
import { invitarUsuario } from "./actions";

/**
 * Issue 275 · D-214, D-215: la invitación se abre en un modal. No crea la cuenta: la deja pendiente
 * y el equipo ejecuta `npm run invitar:pendientes` (D-301).
 */
export function RegistrarUsuario({ opcionesProfesor }: { opcionesProfesor: OpcionProfesor[] }) {
  return (
    <ModalAlta
      titulo="Invitar a un usuario"
      textoBoton="Invitar usuario"
      descripcion="Queda como invitación pendiente: el acceso se crea cuando el equipo ejecuta el comando de invitaciones. Los campos marcados con * son obligatorios."
      accion={invitarUsuario}
    >
      {({ estado, valor, marcarCambios }) => {
        const inicial = estado.valores?.profesorId;
        return (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={claseEtiqueta}>
                <span>Correo <span aria-hidden className="text-peligro">*</span></span>
                <input name="correo" type="email" required maxLength={254} autoComplete="off" placeholder="nombre@dominio.mx"
                  defaultValue={valor("correo")}
                  aria-invalid={estado.campo === "correo"}
                  className={claseCampo(estado.campo === "correo")} />
              </label>
              <label className={claseEtiqueta}>
                <span>Rol <span aria-hidden className="text-peligro">*</span></span>
                <select name="rol" required defaultValue={valor("rol", "DOCENTE")}
                  aria-invalid={estado.campo === "rol"} className={claseCampo(estado.campo === "rol")}>
                  {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
                </select>
              </label>
            </div>
            <SelectorProfesor opciones={opcionesProfesor} etiqueta="Profesor vinculado" requerido={false}
              valorInicial={inicial ? Number(inicial) || undefined : undefined}
              alSeleccionar={marcarCambios}
              error={estado.campo === "profesorId" ? estado.error : undefined} />
          </div>
        );
      }}
    </ModalAlta>
  );
}
