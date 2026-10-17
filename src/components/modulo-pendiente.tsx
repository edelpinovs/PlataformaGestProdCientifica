import { requireModulo } from "@/lib/auth/session";
import { getModulo } from "@/modules/registry";
import { Marco } from "./marco";
import { EstadoVacio, Panel } from "./ui";

// Página temporal de cada módulo hasta que su integrante la reemplace.
export async function ModuloPendiente({ slug }: { slug: string }) {
  const perfil = await requireModulo(slug);
  const modulo = getModulo(slug);

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo={slug} titulo={modulo.nombre} subtitulo={modulo.descripcion}>
      <Panel>
        <p className="mb-4 font-mono text-xs tracking-wide text-marca uppercase">{modulo.requisitos}</p>
        <EstadoVacio>
          En desarrollo por {modulo.integrante}. Liberación prevista: {modulo.liberacion}.
        </EstadoVacio>
      </Panel>
    </Marco>
  );
}
