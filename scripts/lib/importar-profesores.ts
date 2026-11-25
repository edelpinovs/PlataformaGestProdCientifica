// Validación (solo lectura) de los listados reales de profesores antes de importarlos.
// Funciones puras: reciben el texto de los CSV y devuelven qué se puede importar, qué se excluye y por qué.
// Criterio acordado por el equipo: lo ambiguo o inconsistente NO se importa y se anota para revisarlo con el cliente.
// Detalle en docs/IMPORTACION_DATOS_REALES.md.

export type TipoIncidencia =
  | "nombre_invalido"
  | "solo_en_scopus"
  | "persona_repetida"
  | "scholar_error_excel"
  | "scholar_formato"
  | "scholar_url_distinta"
  | "scholar_inusual"
  | "orcid_formato"
  | "scopus_formato"
  | "identificador_multiple"
  | "identificador_repetido"
  | "departamento_contradictorio"
  | "sin_departamento";

export type Efecto = "excluye-persona" | "excluye-campo" | "informativa";

export const EFECTO_POR_TIPO: Record<TipoIncidencia, Efecto> = {
  nombre_invalido: "excluye-persona",
  solo_en_scopus: "excluye-persona",
  persona_repetida: "informativa",
  scholar_error_excel: "informativa",
  scholar_formato: "excluye-campo",
  scholar_url_distinta: "excluye-campo",
  scholar_inusual: "informativa",
  orcid_formato: "excluye-campo",
  scopus_formato: "excluye-campo",
  identificador_multiple: "excluye-campo",
  identificador_repetido: "excluye-campo",
  departamento_contradictorio: "excluye-campo",
  sin_departamento: "informativa",
};

export const DESCRIPCION_TIPO: Record<TipoIncidencia, string> = {
  nombre_invalido: "Nombre o apellidos vacíos o con caracteres que el formulario de Profesores no admite",
  solo_en_scopus: "Aparece en el archivo de Scopus pero no en el listado completo; el nombre viene en un solo campo y no se puede separar en nombres y apellidos sin adivinar",
  persona_repetida: "La misma persona aparece en más de una fila (se fusionan sus datos)",
  scholar_error_excel: "El Scholar ID trae un error de Excel (#VALUE!); se deja vacío",
  scholar_formato: "El Scholar ID no cumple el formato que acepta el sistema",
  scholar_url_distinta: "El Scholar ID no coincide con el que trae su URL",
  scholar_inusual: "El Scholar ID no tiene la forma habitual de un perfil (no termina en AAAAJ); conviene verificarlo",
  orcid_formato: "El ORCID no tiene el formato 0000-0000-0000-0000",
  scopus_formato: "El Scopus ID no tiene de 4 a 20 dígitos",
  identificador_multiple: "La persona tiene dos o más valores del mismo identificador y el sistema guarda uno solo",
  identificador_repetido: "El mismo identificador está asignado a personas distintas (es único en la base)",
  departamento_contradictorio: "El archivo de Scopus da dos departamentos distintos a la misma persona",
  sin_departamento: "No aparece en el archivo de Scopus, así que no se conoce su departamento",
};

export interface Incidencia {
  tipo: TipoIncidencia;
  efecto: Efecto;
  personas: string[];
  detalle: string;
}

export interface PersonaImportable {
  apellidos: string;
  nombres: string;
  orcid: string | null;
  scholarId: string | null;
  scopusId: string | null;
  departamento: string | null;
}

export interface PersonaExcluida {
  nombre: string;
  motivo: TipoIncidencia;
}

export interface ResultadoValidacion {
  importables: PersonaImportable[];
  excluidas: PersonaExcluida[];
  incidencias: Incidencia[];
  resumen: {
    filasCompleto: number;
    filasScopus: number;
    personasCompleto: number;
    importables: number;
    excluidas: number;
    conAlgunCampoExcluido: number;
    porTipo: Record<TipoIncidencia, number>;
  };
}

// ─── Lectura de CSV ──────────────────────────────────────────────────────────

// Lector mínimo de CSV (comillas, comillas escapadas, CRLF y BOM). Sin dependencias nuevas.
export function parsearCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;
  const t = texto.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (entreComillas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          celda += '"';
          i++;
        } else entreComillas = false;
      } else celda += c;
    } else if (c === '"') entreComillas = true;
    else if (c === ",") {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else celda += c;
  }
  if (celda !== "" || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas;
}

const claveEncabezado = (h: string) => h.toUpperCase().replace(/[\s_]+/g, "");

interface FilaLeida {
  linea: number;
  campos: Record<string, string>;
}

// Devuelve las filas con datos (descarta las totalmente vacías) indexadas por encabezado normalizado.
export function leerFilas(texto: string): FilaLeida[] {
  const filas = parsearCsv(texto);
  if (filas.length === 0) return [];
  const encabezados = filas[0].map(claveEncabezado);
  const resultado: FilaLeida[] = [];
  filas.slice(1).forEach((celdas, i) => {
    if (celdas.every((c) => c.trim() === "")) return;
    const campos: Record<string, string> = {};
    encabezados.forEach((h, j) => {
      campos[h] = celdas[j] ?? "";
    });
    resultado.push({ linea: i + 2, campos });
  });
  return resultado;
}

// ─── Normalización ───────────────────────────────────────────────────────────

export const limpiarTexto = (s: string) => s.replace(/[\s ]+/g, " ").trim();

export const sinAcentos = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");

// Palabras del nombre sin acentos, minúsculas y sin puntuación, para cruzar «Apellidos, Nombres» con «Nombres Apellidos».
export function palabrasDeNombre(s: string): string[] {
  return sinAcentos(s)
    .toLowerCase()
    .replace(/[.,\-_]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const claveDePalabras = (p: string[]) => [...p].sort().join(" ");

const NOMBRE_VALIDO = /^[\p{L}][\p{L}\s.'’-]*$/u;
const ORCID_VALIDO = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
const SCHOLAR_VALIDO = /^[\p{L}\d._-]{5,50}$/u;
const SCOPUS_VALIDO = /^\d{4,20}$/;

// ─── Validación ──────────────────────────────────────────────────────────────

interface Persona {
  apellidos: string;
  nombres: string;
  palabras: string[];
  orcid: Set<string>;
  scholar: Set<string>;
  scopus: Set<string>;
  departamentos: Set<string>;
  enCompleto: boolean;
  filas: number;
}

const etiqueta = (p: { apellidos: string; nombres: string }) => `${p.apellidos}, ${p.nombres}`;

export function validarProfesores(entrada: { completo: string; scopus?: string }): ResultadoValidacion {
  const incidencias: Incidencia[] = [];
  const registrar = (tipo: TipoIncidencia, personas: string[], detalle: string) =>
    incidencias.push({ tipo, efecto: EFECTO_POR_TIPO[tipo], personas, detalle });

  const filasCompleto = leerFilas(entrada.completo);
  const filasScopus = leerFilas(entrada.scopus ?? "");

  const personas = new Map<string, Persona>();
  const excluidas: PersonaExcluida[] = [];

  // 1. Listado completo: una persona por nombre (las filas repetidas se fusionan).
  for (const { linea, campos } of filasCompleto) {
    const apellidos = limpiarTexto(campos["APELLIDOS"] ?? "");
    const nombres = limpiarTexto(campos["NOMBRES"] ?? "");
    const nombreFila = `${apellidos || "(sin apellidos)"}, ${nombres || "(sin nombres)"} [fila ${linea}]`;
    if (!NOMBRE_VALIDO.test(apellidos) || !NOMBRE_VALIDO.test(nombres)) {
      registrar("nombre_invalido", [nombreFila], "Revisar el nombre en el listado completo.");
      excluidas.push({ nombre: nombreFila, motivo: "nombre_invalido" });
      continue;
    }
    const palabras = palabrasDeNombre(`${apellidos} ${nombres}`);
    const clave = claveDePalabras(palabras);
    let persona = personas.get(clave);
    if (!persona) {
      persona = {
        apellidos,
        nombres,
        palabras,
        orcid: new Set(),
        scholar: new Set(),
        scopus: new Set(),
        departamentos: new Set(),
        enCompleto: true,
        filas: 0,
      };
      personas.set(clave, persona);
    }
    persona.filas++;

    const orcid = limpiarTexto(campos["ORCIDID"] ?? "").toUpperCase();
    if (orcid) {
      if (ORCID_VALIDO.test(orcid)) persona.orcid.add(orcid);
      else registrar("orcid_formato", [etiqueta(persona)], `Valor recibido: «${orcid}» (fila ${linea}).`);
    }

    const scholarBruto = limpiarTexto(campos["SCHOLARID"] ?? "");
    const url = limpiarTexto(campos["URLSCHOLAR"] ?? "");
    if (scholarBruto.startsWith("#")) {
      registrar("scholar_error_excel", [etiqueta(persona)], `Valor recibido: «${scholarBruto}» (fila ${linea}).`);
    } else if (scholarBruto) {
      const scholar = scholarBruto.split("&")[0];
      const delUrl = /[?&]user=([^&]+)/.exec(url)?.[1];
      if (!SCHOLAR_VALIDO.test(scholar)) {
        registrar("scholar_formato", [etiqueta(persona)], `Valor recibido: «${scholarBruto}» (fila ${linea}).`);
      } else if (delUrl && delUrl !== scholar) {
        registrar("scholar_url_distinta", [etiqueta(persona)], `ID «${scholar}» y URL con «${delUrl}» (fila ${linea}).`);
      } else {
        persona.scholar.add(scholar);
        if (!scholar.endsWith("AAAAJ")) registrar("scholar_inusual", [etiqueta(persona)], `ID «${scholar}» (fila ${linea}).`);
      }
    }

    const scopusBruto = limpiarTexto(campos["SCOPUSID"] ?? "");
    for (const id of scopusBruto.split(/[,;\s]+/).filter(Boolean)) {
      if (SCOPUS_VALIDO.test(id)) persona.scopus.add(id);
      else registrar("scopus_formato", [etiqueta(persona)], `Valor recibido: «${id}» (fila ${linea}).`);
    }
  }

  for (const p of personas.values()) {
    if (p.filas > 1) registrar("persona_repetida", [etiqueta(p)], `Aparece en ${p.filas} filas del listado completo.`);
  }

  // 2. Archivo de Scopus: aporta Scopus ID y departamento. Se cruza por nombre sin acentos ni orden.
  const soloScopus = new Map<string, { nombre: string; filas: number }>();
  const listaPersonas = [...personas.values()];
  for (const { linea, campos } of filasScopus) {
    const nombreFila = limpiarTexto(campos["PROFESOR"] ?? "");
    if (!nombreFila) continue;
    const palabras = palabrasDeNombre(nombreFila);
    const clave = claveDePalabras(palabras);
    let persona = personas.get(clave);
    if (!persona && palabras.length >= 3) {
      // Nombres incompletos en un lado: se acepta si es subconjunto del otro y solo hay un candidato.
      const candidatos = listaPersonas.filter((p) => {
        const [corto, largo] = palabras.length <= p.palabras.length ? [palabras, p.palabras] : [p.palabras, palabras];
        return corto.length >= 3 && corto.every((w) => largo.includes(w));
      });
      if (candidatos.length === 1) persona = candidatos[0];
    }
    if (!persona) {
      const previo = soloScopus.get(clave);
      if (previo) previo.filas++;
      else soloScopus.set(clave, { nombre: nombreFila, filas: 1 });
      continue;
    }
    for (const id of limpiarTexto(campos["SCOPUSID"] ?? "").split(/[,;\s]+/).filter(Boolean)) {
      if (SCOPUS_VALIDO.test(id)) persona.scopus.add(id);
      else registrar("scopus_formato", [etiqueta(persona)], `Archivo de Scopus, fila ${linea}: «${id}».`);
    }
    const departamento = limpiarTexto(campos["DEPARTAMENTO"] ?? "");
    if (departamento) persona.departamentos.add(departamento);
  }
  for (const { nombre } of soloScopus.values()) {
    registrar("solo_en_scopus", [nombre], "Pedir al cliente nombres y apellidos por separado, y género y contratación.");
    excluidas.push({ nombre, motivo: "solo_en_scopus" });
  }

  // 3. Un solo valor por campo; si hay varios o ninguno confiable, el campo se excluye.
  interface Final {
    persona: Persona;
    orcid: string | null;
    scholar: string | null;
    scopus: string | null;
    departamento: string | null;
  }
  const unico = (persona: Persona, valores: Set<string>, nombreCampo: string): string | null => {
    if (valores.size === 0) return null;
    if (valores.size === 1) return [...valores][0];
    registrar("identificador_multiple", [etiqueta(persona)], `${nombreCampo}: ${[...valores].join(", ")}.`);
    return null;
  };
  const finales: Final[] = [...personas.values()].map((persona) => {
    let departamento: string | null = null;
    if (persona.departamentos.size === 1) departamento = [...persona.departamentos][0];
    else if (persona.departamentos.size > 1) {
      registrar("departamento_contradictorio", [etiqueta(persona)], [...persona.departamentos].join(" / "));
    } else registrar("sin_departamento", [etiqueta(persona)], "Sin departamento en el archivo de Scopus.");
    return {
      persona,
      orcid: unico(persona, persona.orcid, "ORCID"),
      scholar: unico(persona, persona.scholar, "Scholar ID"),
      scopus: unico(persona, persona.scopus, "Scopus ID"),
      departamento,
    };
  });

  // 4. Un identificador compartido por personas distintas no se asigna a ninguna.
  const anularRepetidos = (campo: "orcid" | "scholar" | "scopus", nombreCampo: string) => {
    const porValor = new Map<string, Final[]>();
    for (const f of finales) {
      const valor = f[campo];
      if (!valor) continue;
      const llave = campo === "scholar" ? valor.toLowerCase() : valor;
      porValor.set(llave, [...(porValor.get(llave) ?? []), f]);
    }
    for (const [valor, grupo] of porValor) {
      if (grupo.length < 2) continue;
      registrar("identificador_repetido", grupo.map((f) => etiqueta(f.persona)), `${nombreCampo} «${valor}» asignado a ${grupo.length} personas.`);
      for (const f of grupo) f[campo] = null;
    }
  };
  anularRepetidos("orcid", "ORCID");
  anularRepetidos("scholar", "Scholar ID");
  anularRepetidos("scopus", "Scopus ID");

  const importables: PersonaImportable[] = finales.map((f) => ({
    apellidos: f.persona.apellidos,
    nombres: f.persona.nombres,
    orcid: f.orcid,
    scholarId: f.scholar,
    scopusId: f.scopus,
    departamento: f.departamento,
  }));

  const porTipo = Object.fromEntries(Object.keys(EFECTO_POR_TIPO).map((t) => [t, 0])) as Record<TipoIncidencia, number>;
  for (const i of incidencias) porTipo[i.tipo]++;

  const conCampoExcluido = new Set<string>();
  for (const i of incidencias) {
    if (i.efecto === "excluye-campo") i.personas.forEach((p) => conCampoExcluido.add(p));
  }

  return {
    importables,
    excluidas,
    incidencias,
    resumen: {
      filasCompleto: filasCompleto.length,
      filasScopus: filasScopus.length,
      personasCompleto: personas.size + excluidas.filter((e) => e.motivo === "nombre_invalido").length,
      importables: importables.length,
      excluidas: excluidas.length,
      conAlgunCampoExcluido: conCampoExcluido.size,
      porTipo,
    },
  };
}

// ─── Informes ────────────────────────────────────────────────────────────────

// Resumen SIN nombres: puede pegarse en documentos del repositorio (público).
export function resumenAnonimo(r: ResultadoValidacion): string {
  const { resumen } = r;
  const lineas = [
    `| Filas con datos en el listado completo | ${resumen.filasCompleto} |`,
    `| Filas con datos en el archivo de Scopus | ${resumen.filasScopus} |`,
    `| Personas distintas en el listado completo | ${resumen.personasCompleto} |`,
    `| Importables (con los campos ambiguos vacíos) | ${resumen.importables} |`,
    `| Excluidas por completo | ${resumen.excluidas} |`,
    `| Importables con al menos un campo excluido | ${resumen.conAlgunCampoExcluido} |`,
  ];
  const tipos = (Object.keys(EFECTO_POR_TIPO) as TipoIncidencia[]).map(
    (t) => `| \`${t}\` | ${EFECTO_POR_TIPO[t]} | ${resumen.porTipo[t]} | ${DESCRIPCION_TIPO[t]} |`,
  );
  return [
    "| Concepto | Cantidad |",
    "|---|---|",
    ...lineas,
    "",
    "| Incidencia | Efecto | Casos | Qué significa |",
    "|---|---|---|---|",
    ...tipos,
  ].join("\n");
}

// Informe CON nombres, para revisar con el cliente. Solo se escribe en una carpeta ignorada por git.
export function informeDetallado(r: ResultadoValidacion): string {
  const partes = ["# Informe de validación (CONTIENE DATOS PERSONALES; no subir al repositorio)", "", resumenAnonimo(r), ""];
  for (const tipo of Object.keys(EFECTO_POR_TIPO) as TipoIncidencia[]) {
    const casos = r.incidencias.filter((i) => i.tipo === tipo);
    if (casos.length === 0) continue;
    partes.push(`## ${tipo} (${casos.length}) · ${EFECTO_POR_TIPO[tipo]}`, "", DESCRIPCION_TIPO[tipo], "");
    for (const c of casos) partes.push(`- ${c.personas.join(" · ")} — ${c.detalle}`);
    partes.push("");
  }
  return partes.join("\n");
}
