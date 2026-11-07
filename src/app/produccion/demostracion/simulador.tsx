"use client";
import { useActionState } from "react";
import { Aviso, EstadoVacio, Panel, claseBoton, claseBotonSecundario, claseCampo, claseEtiqueta } from "@/components/ui";
import { demostrarEscaneoAction, type EstadoDemo } from "./actions";

export function SimuladorEscaneo() {
  const [estado, accion, pendiente] = useActionState<EstadoDemo, FormData>(demostrarEscaneoAction, { memoria: { obras: [], autorias: [], cortes: [] } });
  return <>
    <Panel titulo="Prueba paso a paso">
      <form action={accion} className="flex flex-col gap-4">
        <p className="text-sm text-texto-2">1. Escanea a Elena sin año: tres registros de ORCID y OpenAlex se unifican en dos obras (2018 y 2023). 2. Repite: no habrá duplicados. 3. Escanea a Tomás: compartirá las dos obras. 4. Cambia los estados y reescanea para comprobar que se conservan.</p>
        <label className={claseEtiqueta}>Año opcional
          <input name="anio" type="number" min="1900" max="2099" disabled={pendiente} aria-invalid={!!estado.error} className={claseCampo(!!estado.error)} placeholder="Vacío para historial o incremental" />
        </label>
        <p className="text-sm text-texto-3">Después del primer escaneo, el incremental puede encontrar cero novedades: las obras anteriores permanecen. Indica 2018 o 2023 para volver a consultar una obra existente. Recargar esta página reinicia la memoria.</p>
        <div className="flex flex-wrap gap-4">
          <button name="operacion" value="escanear-1" disabled={pendiente} className={claseBoton}>Escanear Elena</button>
          <button name="operacion" value="escanear-2" disabled={pendiente} className={claseBoton}>Escanear Tomás</button>
          <button name="operacion" value="validar-1" disabled={pendiente} className={claseBotonSecundario}>Validar autorías de Elena</button>
          <button name="operacion" value="rechazar-2" disabled={pendiente} className={claseBotonSecundario}>Rechazar autorías de Tomás</button>
          <button name="operacion" value="reiniciar" disabled={pendiente} className={claseBotonSecundario}>Reiniciar demostración</button>
        </div>
        {pendiente && <p role="status" className="text-sm text-texto-3">Ejecutando simulación…</p>}
        {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        {estado.mensaje && <Aviso tipo="exito">{estado.mensaje}</Aviso>}
        {!!estado.fuentesConsultadas?.length && <p className="text-sm text-texto-3">Consultas simuladas: {estado.fuentesConsultadas.join(" · ")}</p>}
      </form>
    </Panel>
    <Panel titulo={`Resultados simulados: ${estado.memoria.obras.length} obras y ${estado.memoria.autorias.length} autorías`}>
      <div className="flex flex-col gap-4">
        {!estado.memoria.obras.length && <EstadoVacio>Inicia un escaneo de demostración para ver las obras ficticias.</EstadoVacio>}
        {estado.memoria.obras.map((obra) => <article key={obra.id} className="rounded-xl bg-superficie-alt p-4">
          <h2 className="text-base font-semibold">{obra.titulo}</h2>
          <p className="break-words text-sm text-texto-3">{obra.anio} · {obra.doi}</p>
          <ul className="text-sm text-texto-2">{estado.memoria.autorias.filter((fila) => fila.publicacionId === obra.id).map((fila) => <li key={fila.profesorId}>{fila.profesorId === 1 ? "Elena" : "Tomás"}: {fila.estado}</li>)}</ul>
        </article>)}
      </div>
    </Panel>
  </>;
}
