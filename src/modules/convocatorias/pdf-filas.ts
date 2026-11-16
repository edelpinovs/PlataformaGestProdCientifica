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
// Un texto de encabezado es corto; un párrafo encima de la tabla no lo es.
const LARGO_ENCABEZADO = 30;
// Fuera de las personas de la tabla, solo se pega lo que está a menos de media fila.
const MEDIA_FILA = 0.6;

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

// Una línea con un CVU o un nivel reconocible es un renglón de datos, no parte del encabezado.
function pareceDato(linea: Linea): boolean {
  return linea.fragmentos.some((f) => {
    const cvu = limpiarCvu(f.texto);
    return (cvu !== null && cvu !== "invalido") || traducirNivel(f.texto) !== null;
  });
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

    // Banda de encabezado: la línea con CVU, NOMBRE o APELLIDO y las que están a 14 pt o menos,
    // arriba o abajo (una celda de dos líneas puede ir centrada respecto a las demás). No entra
    // una línea que parezca dato, ni arriba un texto largo (el párrafo del membrete).
    const inicioBanda = lineas.findIndex(esLineaDeEncabezado);
    let finDeBanda: number | null = null;
    if (inicioBanda >= 0) {
      const yBanda = lineas[inicioBanda].y;
      const banda = lineas.filter(
        (l) =>
          Math.abs(yBanda - l.y) <= ALTO_ENCABEZADO &&
          !pareceDato(l) &&
          (l.y <= yBanda || l.fragmentos.every((f) => f.texto.trim().length <= LARGO_ENCABEZADO)),
      );
      columnas = columnasDeEncabezado(banda);
      finDeBanda = Math.min(...banda.map((l) => l.y));
      const techo = Math.max(...banda.map((l) => l.y));
      lineas = lineas.filter((l) => l.y < techo && !banda.includes(l));
      filas.push(columnas.map(textoDeColumna));
    }
    if (!columnas) continue;
    const cols: Columna[] = columnas;

    // Una línea «ancla» es una persona. Firme: trae un CVU válido o un nivel reconocible (o, si el
    // listado no tiene CVU, cualquier nivel; sin CVU ni nivel, toda línea lo es). Dudosa: trae
    // algo en la columna del CVU o del nivel que no se reconoce; cuenta como persona si queda
    // antes de la última firme o pegada a la anterior, para que interpretarListado la avise en
    // vez de perderla. Así el pie de página («…www.secihti.mx») no se vuelve persona.
    const claves = cols.map((c) => claveEncabezado(textoDeColumna(c)));
    const iCvu = claves.findIndex((c) => c.includes("CVU"));
    const iNivel = claves.findIndex((c) => c.includes("NIVEL") || c.includes("DISTINCION"));
    const tipoDeLinea = (celdas: string[][]): "firme" | "dudosa" | "otra" => {
      const nivel = iNivel >= 0 ? unir(celdas[iNivel]) : "";
      if (iCvu < 0) return iNivel < 0 || nivel !== "" ? "firme" : "otra";
      const textoCvu = unir(celdas[iCvu]);
      const cvu = limpiarCvu(textoCvu);
      if ((cvu !== null && cvu !== "invalido") || traducirNivel(nivel) !== null) return "firme";
      return textoCvu || nivel ? "dudosa" : "otra";
    };

    const conCeldas = lineas.map((linea) => {
      const celdas = celdasDeLinea(cols, linea);
      return { linea, celdas, tipo: tipoDeLinea(celdas) };
    });
    const firmes = conCeldas.filter((l) => l.tipo === "firme");

    // Altura típica de fila, medida entre personas firmes.
    const alturas: number[] = [];
    let anterior = finDeBanda;
    for (const { linea } of firmes) {
      if (anterior !== null) alturas.push(anterior - linea.y);
      anterior = linea.y;
    }
    const altura = medianaInferior(alturas) ?? ALTURA_FILA_POR_DEFECTO;
    const ultimaFirme = firmes.at(-1)?.linea.y ?? Infinity;

    const anclas: typeof conCeldas = [];
    for (const l of conCeldas) {
      const previa = anclas.at(-1)?.linea.y ?? finDeBanda;
      const pegada = previa !== null && previa - l.linea.y <= 1.5 * altura;
      if (l.tipo === "firme" || (l.tipo === "dudosa" && (l.linea.y > ultimaFirme || pegada))) anclas.push(l);
    }

    // Las demás líneas (un nombre partido en dos renglones) se pegan a la ancla más cercana si
    // quedan entre dos anclas; antes de la primera o después de la última, solo si están a
    // menos de media fila (así no se pega un pie de página ni una fecha al final).
    const grupos = anclas.map((ancla) => [ancla]);
    for (const l of conCeldas) {
      if (anclas.includes(l)) continue;
      const y = l.linea.y;
      let mejor = -1;
      anclas.forEach(({ linea: ancla }, i) => {
        if (mejor < 0 || Math.abs(ancla.y - y) < Math.abs(anclas[mejor].linea.y - y)) mejor = i;
      });
      if (mejor < 0) continue;
      const entreAnclas = y < anclas[0].linea.y && y > anclas.at(-1)!.linea.y;
      if (entreAnclas || Math.abs(anclas[mejor].linea.y - y) <= MEDIA_FILA * altura) grupos[mejor].push(l);
    }

    for (const grupo of grupos) {
      grupo.sort((a, b) => b.linea.y - a.linea.y);
      filas.push(cols.map((_, i) => unir(grupo.flatMap((l) => l.celdas[i]))));
    }
  }

  return filas;
}
