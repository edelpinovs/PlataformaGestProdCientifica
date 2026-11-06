"use client";

import { claseBotonSecundario, claseCampo, claseEtiqueta } from "@/components/ui";
import { RUTA_PUBLICACIONES, type ConsultaPublicaciones } from "@/modules/produccion/consulta";

export function CantidadPublicaciones({ consulta, conError = false }: { consulta: ConsultaPublicaciones; conError?: boolean }) {
  return <form method="get" action={`${RUTA_PUBLICACIONES}#publicaciones`} className="flex flex-wrap items-end gap-4">
    {Object.entries(consulta).filter(([clave, valor]) => valor && clave !== "pagina" && clave !== "tamanio")
      .map(([clave, valor]) => <input key={clave} type="hidden" name={clave} value={valor} />)}
    <label className={`${claseEtiqueta} sm:flex-row sm:items-center`}>
      Elementos por página
      <select name="tamanio" defaultValue={consulta.tamanio} aria-invalid={conError}
        className={claseCampo(conError)} onChange={(evento) => evento.currentTarget.form?.requestSubmit()}>
        {[20, 50, 100].map((cantidad) => <option key={cantidad} value={cantidad}>{cantidad}</option>)}
      </select>
    </label>
    <noscript><button type="submit" className={claseBotonSecundario}>Aplicar cantidad</button></noscript>
  </form>;
}
