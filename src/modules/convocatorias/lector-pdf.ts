import { extractTextItems } from "unpdf";
import type { Fragmento } from "./pdf-filas";

// RF-017: saca del PDF cada fragmento de texto con su página y posición (origen abajo a la
// izquierda); agruparEnFilas rearma la tabla con ellos. Un PDF escaneado no trae fragmentos.
export async function fragmentosDePdf(datos: Uint8Array): Promise<Fragmento[]> {
  const { items } = await extractTextItems(new Uint8Array(datos));
  return items.flatMap((pagina, indice) =>
    pagina
      .filter((item) => item.str.trim())
      .map((item) => ({ texto: item.str, x: item.x, y: item.y, ancho: item.width, pagina: indice + 1 })),
  );
}
