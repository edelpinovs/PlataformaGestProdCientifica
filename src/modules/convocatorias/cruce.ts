// RF-018 (CU-010): cruza cada renglón del listado oficial con el directorio de profesores
// activos. Orden: CVU, luego Código CUValles y al final el nombre. Un nombre que comparten dos o
// más profesores no se asigna (queda dudoso para resolverlo en la previsualización, RF-019).

export type ProfesorCruce = { id: number; cvu: string | null; codigo: string; nombres: string; apellidos: string };

export type RenglonCruce = {
  cvu: string | null;
  codigo: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  nombres: string;
};

// MANUAL no lo produce el cruce: lo pone la revisión de la carga (RF-019).
export type Criterio = "CVU" | "CODIGO" | "NOMBRE" | "MANUAL" | "AMBIGUO" | "SIN_COINCIDENCIA";
export type Cruce = { profesorId: number | null; criterio: Criterio };
export type ResumenCruce = { coincidencias: number; dudosos: number; sinCoincidencia: number };

/**
 * Forma de comparar nombres: sin acentos, signos ni mayúsculas, con las palabras ordenadas.
 * Así «ANA MARÍA PÉREZ LÓPEZ» y «Pérez López, Ana María» dan la misma clave.
 * Límite conocido (revisión del #236): «Ana María López» y «María Ana López» también dan la
 * misma clave. Si los dos están en el directorio, el renglón queda dudoso (nunca se asigna mal) y
 * la Coordinación lo resuelve a mano en la revisión de la carga (RF-019, criterio MANUAL).
 */
export function claveNombre(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");
}

function agregar<K>(mapa: Map<K, number[]>, clave: K, id: number) {
  const ids = mapa.get(clave);
  if (ids) ids.push(id);
  else mapa.set(clave, [id]);
}

/** `activos` son solo los profesores con estatus laboral ACTIVO; la consulta los filtra. */
export function cruzarRenglones(renglones: RenglonCruce[], activos: ProfesorCruce[]) {
  const porCvu = new Map<string, number>();
  const porCodigo = new Map<string, number>();
  const porNombre = new Map<string, number[]>();
  for (const p of activos) {
    if (p.cvu) porCvu.set(p.cvu.trim(), p.id);
    porCodigo.set(p.codigo.trim(), p.id);
    agregar(porNombre, claveNombre(`${p.apellidos} ${p.nombres}`), p.id);
  }

  const resumen: ResumenCruce = { coincidencias: 0, dudosos: 0, sinCoincidencia: 0 };
  const cruces = renglones.map((r): Cruce => {
    const cvu = r.cvu?.trim();
    if (cvu && porCvu.has(cvu)) return { profesorId: porCvu.get(cvu)!, criterio: "CVU" };
    const codigo = r.codigo?.trim();
    if (codigo && porCodigo.has(codigo)) return { profesorId: porCodigo.get(codigo)!, criterio: "CODIGO" };
    const clave = claveNombre([r.apellidoPaterno, r.apellidoMaterno, r.nombres].filter(Boolean).join(" "));
    const ids = clave ? porNombre.get(clave) ?? [] : [];
    if (ids.length === 1) return { profesorId: ids[0], criterio: "NOMBRE" };
    return { profesorId: null, criterio: ids.length > 1 ? "AMBIGUO" : "SIN_COINCIDENCIA" };
  });

  for (const { criterio } of cruces) {
    if (criterio === "AMBIGUO") resumen.dudosos++;
    else if (criterio === "SIN_COINCIDENCIA") resumen.sinCoincidencia++;
    else resumen.coincidencias++;
  }
  return { cruces, resumen };
}
