"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseBotonSecundario, claseCampo, claseEtiqueta } from "@/components/ui";
import { configurarScopusAction } from "./actions";

export function FormularioConfiguracionScopus({ protegida }: { protegida: boolean }) {
  const [estado, accion, pendiente] = useActionState(configurarScopusAction, {});
  return <form action={accion} className="flex flex-col gap-4" autoComplete="off">
    <label className={claseEtiqueta}>Nueva clave de Scopus
      <input name="clave" type="password" autoComplete="new-password" maxLength={256}
        aria-invalid={!!estado.error} disabled={pendiente || !protegida} className={claseCampo(!!estado.error)} />
    </label>
    <p className="text-sm text-texto-3">La clave actual no se muestra. El cambio se aplica a los próximos escaneos de toda la institución.</p>
    {!protegida && <Aviso tipo="aviso">La protección de claves debe configurarse en el servidor antes de guardar una clave.</Aviso>}
    {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
    {estado.exito && <Aviso tipo="exito">{estado.exito}</Aviso>}
    <div className="flex flex-wrap gap-4">
      <button name="operacion" value="guardar" disabled={pendiente || !protegida} className={claseBoton}>Comprobar y guardar clave</button>
      <button name="operacion" value="comprobar-actual" disabled={pendiente} className={claseBotonSecundario}>Comprobar conexión actual</button>
    </div>
    {pendiente && <p role="status" className="text-sm text-texto-3">Comprobando la conexión…</p>}
  </form>;
}
