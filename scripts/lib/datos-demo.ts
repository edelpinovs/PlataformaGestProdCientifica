// Datos de demostración FICTICIOS (nunca datos reales). Generación pura y determinista:
// sin base de datos ni reloj propio, para poder probarla. La carga está en scripts/demo.ts.
//
// Todo lo que se crea lleva una marca para poder borrarlo sin tocar datos reales:
//   - profesores: correo `…@demo.invalid` y código `DEMO###`
//   - cuerpos académicos: clave `DEMO-CA-##`; programas educativos: clave `DEMO-PE-##`
//   - publicaciones: título que empieza con `[DEMO] `
//   - convocatoria de SNII del año 1999 (solo para mostrar un reconocimiento oficial)
import { normalizar } from "../../src/modules/catalogos/comun";
import { generarNombreNormalizado } from "../../src/modules/profesores/profesores";

export const DOMINIO_DEMO = "demo.invalid";
export const PREFIJO_CODIGO = "DEMO";
export const PREFIJO_CA = "DEMO-CA-";
export const PREFIJO_PE = "DEMO-PE-";
export const PREFIJO_DOI = "10.0000/demo.";
export const MARCA_TITULO = "[DEMO] ";
export const ANIO_CONVOCATORIA_DEMO = 1999;

// Departamentos y grados que ya crea `prisma/seed.ts`.
export const DEPARTAMENTOS_BASE = ["DEP-A1", "DEP-A2", "DEP-B1", "DEP-B2", "DEP-C1", "DEP-C2"] as const;
export const GRADOS_BASE = ["Licenciatura", "Maestría", "Doctorado"] as const;

export const CANTIDAD_PROFESORES = 50;

type Estatus = "ACTIVO" | "LICENCIA" | "BAJA_TEMPORAL" | "BAJA_POSDOCTORAL" | "TRASLADADO";
type Contratacion = "TIEMPO_COMPLETO" | "ASIGNATURA";
type Nivel = "CANDIDATO" | "NIVEL_1" | "NIVEL_2" | "NIVEL_3" | "EMERITO" | "NO_APROBADO";
type Resultado = "APROBADO" | "NO_APROBADO" | "EN_RECONSIDERACION";
type TipoPublicacion = "ARTICULO" | "LIBRO" | "CAPITULO" | "MEMORIA_CONGRESO" | "REGISTRO_SOFTWARE" | "PATENTE" | "OTRO";
type Fuente = "ORCID" | "SCOPUS" | "OPENALEX" | "GOOGLE_SCHOLAR" | "MANUAL";
type EstadoAutoria = "PENDIENTE" | "VALIDADA" | "RECHAZADA";

export type ProgramaDemo = { clave: string; nombre: string; departamento: string };

export type ProfesorDemo = {
  indice: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  nombreNormalizado: string;
  correo: string;
  genero: "M" | "F";
  tipoContratacion: Contratacion;
  estatusLaboral: Estatus;
  grado: (typeof GRADOS_BASE)[number] | null;
  departamento: (typeof DEPARTAMENTOS_BASE)[number] | null;
  programa: string | null;
  cvu: string | null;
  orcid: string | null;
  scopusId: string | null;
  scholarId: string | null;
};

export type SniiDemo = {
  profesor: number;
  nivel: Nivel;
  tipoParticipacion: "NUEVO_INGRESO" | "RENOVACION" | "REINGRESO_NO_VIGENTE";
  resultado: Resultado;
  inicio: Date;
  fin: Date;
  conConvocatoria: boolean;
};

export type ProdepDemo = {
  profesor: number;
  tipoSolicitud: "PRIMER_RECONOCIMIENTO" | "RENOVACION";
  resultado: Resultado;
  inicio: Date;
  fin: Date;
};

export type LgacDemo = { nombre: string; descripcion: string | null; profesores: number[] };

export type CuerpoDemo = {
  clave: string;
  nombre: string;
  nivel: "EN_FORMACION" | "EN_CONSOLIDACION" | "CONSOLIDADO";
  areaProdep: string;
  disciplina: string;
  departamento: (typeof DEPARTAMENTOS_BASE)[number];
  anioRegistro: number;
  anioVencimiento: number;
  integrantes: number[];
  lider: number | null;
  lgacs: LgacDemo[];
};

export type PublicacionDemo = {
  indice: number;
  tipo: TipoPublicacion;
  titulo: string;
  tituloNormalizado: string;
  doi: string | null;
  autoresTexto: string;
  revistaEditorial: string | null;
  isbnIssn: string | null;
  fechaPublicacion: Date | null;
  volumen: string | null;
  paginas: string | null;
  evidenciaUrl: string | null;
  fuente: Fuente;
};

export type AutoriaDemo = { publicacion: number; profesor: number; estado: EstadoAutoria; revisadaEn: Date | null };

export type DatosDemo = {
  programas: ProgramaDemo[];
  profesores: ProfesorDemo[];
  snii: SniiDemo[];
  prodep: ProdepDemo[];
  cuerpos: CuerpoDemo[];
  publicaciones: PublicacionDemo[];
  autorias: AutoriaDemo[];
};

const rellenar = (n: number, largo: number) => String(n).padStart(largo, "0");

// Día UTC (a medianoche) desplazado `dias` respecto de `hoy`.
export function dia(hoy: Date, dias: number) {
  const fecha = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha;
}

const ESTATUS_ESPECIALES: Record<number, Estatus> = {
  12: "LICENCIA",
  37: "LICENCIA",
  19: "BAJA_TEMPORAL",
  26: "BAJA_POSDOCTORAL",
  44: "TRASLADADO",
};

function generarProgramas(): ProgramaDemo[] {
  return DEPARTAMENTOS_BASE.map((departamento, i) => ({
    clave: `${PREFIJO_PE}${rellenar(i + 1, 2)}`,
    nombre: `Programa Educativo ${rellenar(i + 1, 2)}`,
    departamento,
  }));
}

function generarProfesores(programas: ProgramaDemo[]): ProfesorDemo[] {
  const grados = ["Doctorado", "Maestría", "Doctorado", "Licenciatura"] as const;
  return Array.from({ length: CANTIDAD_PROFESORES }, (_, k) => {
    const i = k + 1;
    const n = rellenar(i, 2);
    let nombres = `Nombre ${n}`;
    let apellidos = `Apellido ${n} Apellido ${rellenar(((i + 24) % CANTIDAD_PROFESORES) + 1, 2)}`;
    // Casos límite para ver la interfaz: nombre muy largo y nombre con acentos y eñe.
    if (i === 7) nombres = `Nombre ${n} con un nombre compuesto muy largo para probar el apilado en celular`;
    if (i === 8) {
      nombres = `Ángela María ${n}`;
      apellidos = `Peña Núñez ${n}`;
    }
    const departamento = i === 49 ? null : DEPARTAMENTOS_BASE[(i - 1) % DEPARTAMENTOS_BASE.length];
    const tipoContratacion: Contratacion = [3, 6, 9].includes(i % 10) ? "ASIGNATURA" : "TIEMPO_COMPLETO";
    return {
      indice: i,
      codigo: `${PREFIJO_CODIGO}${rellenar(i, 3)}`,
      nombres,
      apellidos,
      nombreNormalizado: generarNombreNormalizado(nombres, apellidos),
      correo: `profesor${n}@${DOMINIO_DEMO}`,
      genero: i % 2 === 0 ? "F" : "M",
      tipoContratacion,
      estatusLaboral: ESTATUS_ESPECIALES[i] ?? "ACTIVO",
      grado: i === 50 ? null : grados[i % 4],
      departamento,
      programa: departamento && tipoContratacion === "TIEMPO_COMPLETO"
        ? (programas.find((p) => p.departamento === departamento)?.clave ?? null)
        : null,
      cvu: i <= 30 ? `90${rellenar(i, 4)}` : null,
      orcid: i % 2 === 1 ? `0000-0001-0000-${rellenar(i, 4)}` : null,
      scopusId: i % 2 === 0 ? `5700000${rellenar(i, 3)}` : null,
      scholarId: i % 3 === 0 ? `DEMOSCH${rellenar(i, 3)}` : null,
    };
  });
}

function generarSnii(hoy: Date): SniiDemo[] {
  const niveles: Nivel[] = ["NIVEL_1", "NIVEL_2", "CANDIDATO", "NIVEL_3", "EMERITO", "NIVEL_1", "NIVEL_2", "CANDIDATO"];
  const registros: SniiDemo[] = [];
  for (let k = 1; k <= 16; k++) {
    let inicio = dia(hoy, -400);
    let fin = dia(hoy, 700);
    // Vigente (k%8 = 1…5), por vencer (6), termina hoy (7) o vencido (0).
    if (k % 8 === 6) fin = dia(hoy, 30);
    if (k % 8 === 7) fin = dia(hoy, 0);
    if (k % 8 === 0) {
      inicio = dia(hoy, -1000);
      fin = dia(hoy, -200);
    }
    let nivel = niveles[k % 8];
    let resultado: Resultado = "APROBADO";
    if (k === 13 || k === 14) resultado = "EN_RECONSIDERACION";
    if (k === 15 || k === 16) {
      nivel = "NO_APROBADO";
      resultado = "NO_APROBADO";
    }
    registros.push({
      profesor: k,
      nivel,
      tipoParticipacion: k % 3 === 0 ? "RENOVACION" : "NUEVO_INGRESO",
      resultado,
      inicio,
      fin,
      conConvocatoria: k === 3,
    });
  }
  // Dos profesores con un periodo anterior que termina antes de que empiece el actual.
  for (const k of [1, 2]) {
    registros.push({
      profesor: k,
      nivel: "CANDIDATO",
      tipoParticipacion: "NUEVO_INGRESO",
      resultado: "APROBADO",
      inicio: dia(hoy, -1500),
      fin: dia(hoy, -401),
      conConvocatoria: false,
    });
  }
  return registros;
}

const nombreDe = (p: ProfesorDemo) => `${p.apellidos}, ${p.nombres}`;

function generarCuerpos(profesores: ProfesorDemo[]): CuerpoDemo[] {
  const tamanos = [4, 3, 4, 4, 3, 0];
  const niveles = ["EN_FORMACION", "EN_CONSOLIDACION", "CONSOLIDADO"] as const;
  return DEPARTAMENTOS_BASE.map((departamento, d) => {
    const i = d + 1;
    const n = rellenar(i, 2);
    const candidatos = profesores.filter(
      (p) => p.departamento === departamento && p.tipoContratacion === "TIEMPO_COMPLETO" && p.estatusLaboral === "ACTIVO",
    );
    const integrantes = candidatos.slice(0, tamanos[d]).map((p) => p.indice);
    const lgacs: LgacDemo[] = [];
    if (integrantes.length > 0) {
      const mitad = Math.max(1, Math.ceil(integrantes.length / 2));
      lgacs.push(
        { nombre: `LGAC ${n}-A: línea de ejemplo`, descripcion: `Descripción de ejemplo de la línea ${n}-A.`, profesores: integrantes.slice(0, mitad) },
        { nombre: `LGAC ${n}-B: otra línea de ejemplo`, descripcion: null, profesores: integrantes.slice(mitad).length > 0 ? integrantes.slice(mitad) : integrantes.slice(0, 1) },
      );
    }
    const anioRegistro = 2019 + (i % 4);
    return {
      clave: `${PREFIJO_CA}${n}`,
      nombre: `Cuerpo Académico Demo ${n}`,
      nivel: niveles[d % 3],
      areaProdep: `Área de ejemplo ${n}`,
      disciplina: `Disciplina de ejemplo ${n}`,
      departamento,
      anioRegistro,
      // El primero ya venció, para ver ese caso.
      anioVencimiento: i === 1 ? 2025 : anioRegistro + 6,
      integrantes,
      // El 5 queda sin líder y el 6 sin integrantes.
      lider: i <= 4 ? (integrantes[0] ?? null) : null,
      lgacs,
    };
  });
}

function generarProdep(hoy: Date, profesores: ProfesorDemo[], cuerpos: CuerpoDemo[]): ProdepDemo[] {
  const registros: ProdepDemo[] = [];
  const usados = new Set<number>();
  const agregar = (profesor: number, resultado: Resultado, inicio: Date, fin: Date) => {
    usados.add(profesor);
    registros.push({
      profesor,
      tipoSolicitud: profesor % 2 === 0 ? "RENOVACION" : "PRIMER_RECONOCIMIENTO",
      resultado,
      inicio,
      fin,
    });
  };
  // PRODEP vigente para el primer integrante de cada cuerpo con integrantes (RF-013 lo exige) y el segundo del 4.
  for (const cuerpo of cuerpos) {
    if (cuerpo.integrantes[0] !== undefined) agregar(cuerpo.integrantes[0], "APROBADO", dia(hoy, -300), dia(hoy, 900));
  }
  const cuarto = cuerpos[3];
  if (cuarto?.integrantes[1] !== undefined) agregar(cuarto.integrantes[1], "APROBADO", dia(hoy, -200), dia(hoy, 600));
  // Casos para ver otros estados: vencido, en reconsideración, no aprobado y uno más vigente.
  const libres = profesores
    .filter((p) => p.tipoContratacion === "TIEMPO_COMPLETO" && !usados.has(p.indice))
    .map((p) => p.indice);
  const [a, b, c, d] = [libres[0], libres[1], libres[2], libres[3]];
  if (a !== undefined) agregar(a, "APROBADO", dia(hoy, -900), dia(hoy, -100));
  if (b !== undefined) agregar(b, "EN_RECONSIDERACION", dia(hoy, -50), dia(hoy, 500));
  if (c !== undefined) agregar(c, "NO_APROBADO", dia(hoy, -400), dia(hoy, -30));
  if (d !== undefined) agregar(d, "APROBADO", dia(hoy, -100), dia(hoy, 800));
  return registros;
}

function generarPublicaciones(hoy: Date, profesores: ProfesorDemo[]) {
  const tipos: TipoPublicacion[] = ["ARTICULO", "LIBRO", "CAPITULO", "MEMORIA_CONGRESO", "REGISTRO_SOFTWARE", "PATENTE", "OTRO"];
  const fuentes: Fuente[] = ["ORCID", "SCOPUS", "OPENALEX", "GOOGLE_SCHOLAR", "MANUAL"];
  const estados = (valor: number): EstadoAutoria => (valor === 0 ? "RECHAZADA" : valor <= 3 ? "PENDIENTE" : "VALIDADA");

  const publicaciones: PublicacionDemo[] = [];
  const autorias: AutoriaDemo[] = [];
  for (let i = 1; i <= 30; i++) {
    const n = rellenar(i, 2);
    const tipo = tipos[i % 7];
    const fuente = fuentes[i % 5];
    const titulo = `${MARCA_TITULO}Publicación ${n}: título de ejemplo`;

    const autores: number[] = [];
    const cantidad = 1 + (i % 3);
    for (let j = 0; autores.length < cantidad; j++) {
      const candidato = ((i * 3 + j * 7) % CANTIDAD_PROFESORES) + 1;
      if (!autores.includes(candidato)) autores.push(candidato);
    }
    autores.forEach((profesor, j) => {
      const estado = estados((i + j) % 10);
      autorias.push({
        publicacion: i,
        profesor,
        estado,
        revisadaEn: estado === "PENDIENTE" ? null : dia(hoy, -(i % 20) - 1),
      });
    });

    publicaciones.push({
      indice: i,
      tipo,
      titulo,
      tituloNormalizado: normalizar(titulo),
      doi: i % 5 === 0 ? null : `${PREFIJO_DOI}${rellenar(i, 3)}`,
      autoresTexto: autores.map((a) => nombreDe(profesores[a - 1])).join("; "),
      revistaEditorial: tipo === "ARTICULO" ? `Revista de Ejemplo ${rellenar((i % 6) + 1, 2)}`
        : tipo === "LIBRO" || tipo === "CAPITULO" ? `Editorial de Ejemplo ${rellenar((i % 4) + 1, 2)}` : null,
      isbnIssn: tipo === "ARTICULO" ? `0000-${rellenar(i, 4)}` : tipo === "LIBRO" ? `978-0-0000-${rellenar(i, 4)}-0` : null,
      fechaPublicacion: i % 7 === 0 ? null : dia(hoy, -1400 + i * 40),
      volumen: tipo === "ARTICULO" ? String((i % 12) + 1) : null,
      paginas: tipo === "ARTICULO" ? `${i}-${i + 9}` : null,
      evidenciaUrl: fuente === "MANUAL" ? `https://ejemplo.invalid/evidencia/${n}` : null,
      fuente,
    });
  }
  return { publicaciones, autorias };
}

export function generarDatosDemo(hoy: Date): DatosDemo {
  const programas = generarProgramas();
  const profesores = generarProfesores(programas);
  const cuerpos = generarCuerpos(profesores);
  const { publicaciones, autorias } = generarPublicaciones(hoy, profesores);
  return {
    programas,
    profesores,
    snii: generarSnii(hoy),
    prodep: generarProdep(hoy, profesores, cuerpos),
    cuerpos,
    publicaciones,
    autorias,
  };
}
