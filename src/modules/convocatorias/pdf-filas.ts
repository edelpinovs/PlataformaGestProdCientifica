import { claveEncabezado, limpiarCvu, traducirNivel } from "./lectura";

// RF-017: un PDF no trae tabla, solo fragmentos de texto con su posición. Esta función rearma
// las filas de la tabla del listado oficial a partir de esas posiciones, para que
// interpretarListado las lea igual que las de un Excel. Coordenadas de PDF: la y crece hacia arriba.

export type Fragmento = { texto: string; x: number; y: number; ancho: number; pagina: number };

// Fragmentos con alturas que difieren hasta 2 pt están en la misma línea.
const TOLERANCIA_LINEA = 2;
// Un encabezado puede ocupar dos líneas («APELLIDO» / «PATERNO»).
const ALTO_ENCABEZADO = 14;
// Si una página tiene una sola fila, no hay de dónde medir la altura típica.
const ALTURA_FILA_POR_DEFECTO = 20;

type Linea = { y: number; fragmentos: Fragmento[] };
type Columna = { inicio: number; fin: number; partes: { y: number; texto: string }[] };

const centro = (f: Fragmento) => f.x + f.ancho / 2;
const unir = (textos: string[]) => textos.join(" ").replace(/\s+/g, " ").trim();

function agruparEnLineas(fragmentos: Fragmento[]): Linea[] {
  const lineas: Linea[] = [];
  for (const fragmento of [...fragmentos].sort((a, b) => b.y - a.y)) {
    const linea = lineas.at(-1);
    if (linea && linea.y - fragmento.y <= TOLERANCIA_LINEA) linea.fragmentos.push(fragmento);
    else lineas.push({ y: fragmento.y, fragmentos: [fragmento] });
  }
  for (const linea of lineas) linea.fragmentos.sort((a, b) => a.x - b.x);
  return lineas;
}

function esLineaDeEncabezado(linea: Linea): boolean {
  return linea.fragmentos.some((f) => {
    const clave = claveEncabezado(f.texto);
    return clave === "CVU" || clave.startsWith("NOMBRE") || clave.startsWith("APELLIDO");
  });
}

// Las columnas son los grupos de fragmentos del encabezado que se solapan en horizontal.
function columnasDeEncabezado(banda: Linea[]): Columna[] {
  const columnas: Columna[] = [];
  for (const linea of banda) {
    for (const f of linea.fragmentos) {
      const columna = columnas.find((c) => f.x <= c.fin && f.x + f.ancho >= c.inicio);
      if (columna) {
        columna.inicio = Math.min(columna.inicio, f.x);
        columna.fin = Math.max(columna.fin, f.x + f.ancho);
        columna.partes.push({ y: f.y, texto: f.texto });
      } else {
        columnas.push({ inicio: f.x, fin: f.x + f.ancho, partes: [{ y: f.y, texto: f.texto }] });
      }
    }
  }
  return columnas.sort((a, b) => a.inicio - b.inicio);
}

const textoDeColumna = (c: Columna) => unir([...c.partes].sort((a, b) => b.y - a.y).map((p) => p.texto));

// El encabezado va centrado y el dato alineado a la izquierda o a la derecha de la celda: el
// límite entre dos columnas se toma a medio camino entre el fin de un encabezado y el inicio del
// siguiente, y cada fragmento va a la columna que contiene su centro.
function indiceDeColumna(columnas: Columna[], fragmento: Fragmento): number {
  const x = centro(fragmento);
  for (let i = 0; i < columnas.length - 1; i++) {
    if (x < (columnas[i].fin + columnas[i + 1].inicio) / 2) return i;
  }
  return columnas.length - 1;
}

function celdasDeLinea(columnas: Columna[], linea: Linea): string[][] {
  const celdas: string[][] = columnas.map(() => []);
  for (const f of linea.fragmentos) celdas[indiceDeColumna(columnas, f)].push(f.texto);
  return celdas;
}

function medianaInferior(valores: number[]): number | undefined {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.floor((ordenados.length - 1) / 2)];
}

export function agruparEnFilas(fragmentos: Fragmento[]): string[][] {
  const paginas = [...new Set(fragmentos.filter((f) => f.texto.trim()).map((f) => f.pagina))].sort((a, b) => a - b);
  const filas: string[][] = [];
  let columnas: Columna[] | null = null;

  for (const pagina of paginas) {
    let lineas = agruparEnLineas(fragmentos.filter((f) => f.pagina === pagina && f.texto.trim()));

    // Banda de encabezado: lo de arriba (membrete, párrafo) se descarta.
    const inicioBanda = lineas.findIndex(esLineaDeEncabezado);
    let finDeBanda: number | null = null;
    if (inicioBanda >= 0) {
      const yBanda = lineas[inicioBanda].y;
      const banda = lineas.slice(inicioBanda).filter((l) => yBanda - l.y <= ALTO_ENCABEZADO);
      columnas = columnasDeEncabezado(banda);
      finDeBanda = banda.at(-1)!.y;
      lineas = lineas.slice(inicioBanda + banda.length);
      filas.push(columnas.map(textoDeColumna));
    }
    if (!columnas) continue;
    const cols: Columna[] = columnas;

    // Las líneas «ancla» son una por persona; las demás (un nombre partido en dos renglones) se
    // pegan a la ancla más cercana. Con columna de CVU, ancla es la que trae un CVU válido o un
    // nivel reconocible: así el pie de página («…www.secihti.mx») bajo la columna del nivel no
    // cuenta como persona. Sin CVU, basta con que traiga nivel; sin ninguna, cada línea es ancla.
    const claves = cols.map((c) => claveEncabezado(textoDeColumna(c)));
    const iCvu = claves.findIndex((c) => c.includes("CVU"));
    const iNivel = claves.findIndex((c) => c.includes("NIVEL") || c.includes("DISTINCION"));
    const esAncla = (celdas: string[][]) => {
      const nivel = iNivel >= 0 ? unir(celdas[iNivel]) : "";
      if (iCvu < 0) return iNivel < 0 || nivel !== "";
      const cvu = limpiarCvu(unir(celdas[iCvu]));
      return (cvu !== null && cvu !== "invalido") || traducirNivel(nivel) !== null;
    };

    const conCeldas = lineas.map((linea) => ({ linea, celdas: celdasDeLinea(cols, linea) }));
    const anclas = conCeldas.filter((l) => esAncla(l.celdas));

    // Altura típica de fila; una ancla mucho más abajo (pie de página) termina la tabla.
    const alturas: number[] = [];
    let anterior = finDeBanda;
    for (const { linea } of anclas) {
      if (anterior !== null) alturas.push(anterior - linea.y);
      anterior = linea.y;
    }
    const altura = medianaInferior(alturas) ?? ALTURA_FILA_POR_DEFECTO;
    let corte = anclas.length;
    anterior = finDeBanda;
    anclas.forEach(({ linea }, i) => {
      if (corte === anclas.length && anterior !== null && anterior - linea.y > 3 * altura) corte = i;
      anterior = linea.y;
    });
    const anclasDeTabla = anclas.slice(0, corte);

    const grupos = anclasDeTabla.map((ancla) => [ancla]);
    for (const linea of conCeldas) {
      if (anclas.includes(linea)) continue;
      let mejor = -1;
      anclasDeTabla.forEach(({ linea: ancla }, i) => {
        const distancia = Math.abs(ancla.y - linea.linea.y);
        if (distancia <= 1.5 * altura && (mejor < 0 || distancia < Math.abs(anclasDeTabla[mejor].linea.y - linea.linea.y))) {
          mejor = i;
        }
      });
      if (mejor >= 0) grupos[mejor].push(linea);
    }

    for (const grupo of grupos) {
      grupo.sort((a, b) => b.linea.y - a.linea.y);
      filas.push(cols.map((_, i) => unir(grupo.flatMap((l) => l.celdas[i]))));
    }
  }

  return filas;
}
