import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import {
  analizarCalidad,
  COLUMNAS_CALIDAD,
  filtrarHallazgos,
  hallazgosVigenciasVencidas,
  LISTADO_CALIDAD,
  ordenarHallazgos,
  type CuerpoCalidad,
  type ProfesorCalidad,
} from "./calidad";
import { calcularSemaforo } from "@/modules/reportes/semaforo";
import type { FilaVigencia } from "@/modules/reportes/vigencias";

const profesor = (id: number, extra: Partial<ProfesorCalidad> = {}): ProfesorCalidad => ({
  id,
  codigo: `C${id}`,
  nombres: `Nombre${id}`,
  apellidos: `Apellido${id}`,
  estatusLaboral: "ACTIVO",
  orcid: "0000-0001-0000-0001",
  scopusId: null,
  tienePerfil: true,
  ...extra,
});

const cuerpo = (id: number, extra: Partial<CuerpoCalidad> = {}): CuerpoCalidad => ({
  id,
  clave: `UDG-CA-${id}`,
  nombre: `Cuerpo ${id}`,
  liderId: 1,
  integrantes: [1, 2],
  ...extra,
});

const reglas = (h: { regla: string }[]) => h.map((x) => x.regla);

describe("calidad de datos", () => {
  it("datos sanos no producen hallazgos", () => {
    expect(analizarCalidad({ profesores: [profesor(1), profesor(2)], cuerpos: [cuerpo(1)] })).toEqual([]);
  });

  it("detecta un cuerpo académico sin líder", () => {
    const h = analizarCalidad({ profesores: [profesor(1), profesor(2)], cuerpos: [cuerpo(1, { liderId: null })] });
    expect(reglas(h)).toEqual(["CA_SIN_LIDER"]);
    expect(h[0]).toMatchObject({ severidad: "aviso", enlace: "/cuerpos-academicos/1", registro: "UDG-CA-1 · Cuerpo 1" });
  });

  it("detecta un líder que no es integrante, con severidad de error", () => {
    const h = analizarCalidad({ profesores: [profesor(1), profesor(2), profesor(3)], cuerpos: [cuerpo(1, { liderId: 3 })] });
    expect(reglas(h)).toEqual(["LIDER_NO_INTEGRANTE"]);
    expect(h[0].severidad).toBe("error");
    expect(h[0].detalle).toContain("Apellido3 Nombre3 (C3)");
  });

  it("detecta integrantes de baja o trasladados, pero no a quien está en licencia", () => {
    const profesores = [
      profesor(1),
      profesor(2, { estatusLaboral: "BAJA_TEMPORAL" }),
      profesor(3, { estatusLaboral: "TRASLADADO" }),
      profesor(4, { estatusLaboral: "LICENCIA" }),
    ];
    const h = analizarCalidad({ profesores, cuerpos: [cuerpo(1, { integrantes: [1, 2, 3, 4] })] });
    expect(reglas(h)).toEqual(["INTEGRANTE_DE_BAJA", "INTEGRANTE_DE_BAJA"]);
    expect(h.map((x) => x.clave)).toEqual(["INTEGRANTE_DE_BAJA:1-2", "INTEGRANTE_DE_BAJA:1-3"]);
    expect(h[0].detalle).toContain("baja temporal");
  });

  it("un profesor activo sin ORCID ni Scopus se señala; con uno de los dos, no", () => {
    const h = analizarCalidad({
      profesores: [
        profesor(1, { orcid: null, scopusId: null }),
        profesor(2, { orcid: null, scopusId: "123" }),
        profesor(3, { orcid: "0000", scopusId: null }),
      ],
      cuerpos: [],
    });
    expect(h.map((x) => x.clave)).toEqual(["SIN_IDENTIFICADORES:1"]);
    expect(h[0].enlace).toBe("/profesores?q=C1");
  });

  it("un profesor activo sin perfil se señala y enlaza a usuarios", () => {
    const h = analizarCalidad({ profesores: [profesor(1, { tienePerfil: false })], cuerpos: [] });
    expect(reglas(h)).toEqual(["SIN_PERFIL"]);
    expect(h[0].enlace).toBe("/administracion/usuarios");
  });

  it("quien no está activo no se señala por identificadores ni por perfil", () => {
    const h = analizarCalidad({
      profesores: [profesor(1, { estatusLaboral: "BAJA_TEMPORAL", orcid: null, tienePerfil: false })],
      cuerpos: [],
    });
    expect(h).toEqual([]);
  });

  it("la clave de cada hallazgo es única", () => {
    const h = analizarCalidad({
      profesores: [profesor(1, { orcid: null, tienePerfil: false }), profesor(2, { orcid: null, tienePerfil: false })],
      cuerpos: [cuerpo(1, { liderId: null }), cuerpo(2, { liderId: null })],
    });
    expect(new Set(h.map((x) => x.clave)).size).toBe(h.length);
  });

  it("no falla si un integrante o líder ya no existe entre los profesores", () => {
    const h = analizarCalidad({ profesores: [profesor(1)], cuerpos: [cuerpo(1, { liderId: 9, integrantes: [1, 8] })] });
    expect(reglas(h)).toEqual(["LIDER_NO_INTEGRANTE"]);
  });
});

describe("listado de calidad", () => {
  const hallazgos = analizarCalidad({
    profesores: [profesor(1, { orcid: null, tienePerfil: false }), profesor(2, { apellidos: "Álvarez" })],
    cuerpos: [cuerpo(1, { liderId: null, nombre: "Química" })],
  });
  const consulta = (p: Record<string, string> = {}) => analizarListado(LISTADO_CALIDAD, p).consulta;

  it("filtra por regla", () => {
    expect(reglas(filtrarHallazgos(hallazgos, consulta({ regla: "SIN_PERFIL" })))).toEqual(["SIN_PERFIL"]);
  });

  it("busca sin distinguir mayúsculas ni acentos, en registro, problema y detalle", () => {
    expect(filtrarHallazgos(hallazgos, consulta({ q: "quimica" }))).toHaveLength(1);
    expect(filtrarHallazgos(hallazgos, consulta({ q: "SIN LIDER" }))).toHaveLength(1);
    expect(filtrarHallazgos(hallazgos, consulta({ q: "no se pueden buscar" }))).toHaveLength(1);
    expect(filtrarHallazgos(hallazgos, consulta({ q: "no existe" }))).toEqual([]);
  });

  it("los comodines de SQL se buscan como texto", () => {
    expect(filtrarHallazgos(hallazgos, consulta({ q: "%" }))).toEqual([]);
  });

  it("ordena por problema ascendente por omisión y en el sentido pedido", () => {
    const asc = ordenarHallazgos(hallazgos, consulta()).map((h) => h.regla);
    expect(asc).toEqual(["CA_SIN_LIDER", "SIN_IDENTIFICADORES", "SIN_PERFIL"]);
    expect(ordenarHallazgos(hallazgos, consulta({ dir: "desc" })).map((h) => h.regla)).toEqual([...asc].reverse());
  });

  it("una columna fuera de la lista no cambia el orden", () => {
    expect(ordenarHallazgos(hallazgos, consulta({ orden: "contrasena" }))).toEqual(ordenarHallazgos(hallazgos, consulta()));
  });

  it("no modifica la lista original", () => {
    const copia = [...hallazgos];
    ordenarHallazgos(hallazgos, consulta({ orden: "registro", dir: "desc" }));
    expect(hallazgos).toEqual(copia);
  });

  it("toda columna ordenable tiene texto para el selector de celular", () => {
    expect(COLUMNAS_CALIDAD.map((c) => c.clave)).toEqual([...LISTADO_CALIDAD.columnas]);
    for (const clave of LISTADO_CALIDAD.columnas) expect(() => ordenarHallazgos(hallazgos, consulta({ orden: clave }))).not.toThrow();
  });
});

describe("vigencias vencidas (#278)", () => {
  const hoy = new Date(Date.UTC(2026, 10, 24));
  const fila = (id: string, fin: Date, extra: Partial<FilaVigencia> = {}): FilaVigencia => ({
    id, tipo: "SNII", nombre: `Persona ${id}`, detalle: "Nivel I", departamento: "Ciencias", inicio: new Date(Date.UTC(2020, 0, 1)),
    fin, semaforo: calcularSemaforo(fin, hoy), ...extra,
  });

  it("solo reporta lo que el semáforo de Reportes pinta de rojo", () => {
    const filas = [
      fila("snii-1", new Date(Date.UTC(2026, 10, 23))),
      fila("snii-2", new Date(Date.UTC(2026, 10, 24))),
      fila("snii-3", new Date(Date.UTC(2027, 10, 24))),
      fila("snii-4", new Date(Date.UTC(2028, 0, 1))),
    ];
    expect(filas.map((f) => f.semaforo)).toEqual(["ROJO", "AMARILLO", "AMARILLO", "VERDE"]);
    const h = hallazgosVigenciasVencidas(filas);
    expect(h.map((x) => x.clave)).toEqual(["VIGENCIA_VENCIDA:snii-1"]);
  });

  it("explica la vigencia en español y enlaza al reporte", () => {
    const [h] = hallazgosVigenciasVencidas([fila("prodep-7", new Date(Date.UTC(2025, 5, 30)), { tipo: "PRODEP", detalle: "Renovación", nombre: "Ana Pérez" })]);
    expect(h).toMatchObject({ regla: "VIGENCIA_VENCIDA", severidad: "aviso", registro: "Ana Pérez" });
    expect(h.detalle).toContain("PRODEP");
    expect(h.detalle).toContain("Renovación");
    expect(h.detalle).toMatch(/venció el .*2025/);
    expect(h.enlace).toBe("/reportes?semaforo=ROJO&q=Ana%20P%C3%A9rez");
  });

  it("sin vigencias vencidas no hay hallazgos", () => {
    expect(hallazgosVigenciasVencidas([])).toEqual([]);
  });

  it("el filtro por problema acepta la regla nueva", () => {
    const { consulta } = analizarListado(LISTADO_CALIDAD, { regla: "VIGENCIA_VENCIDA" });
    const h = hallazgosVigenciasVencidas([fila("snii-1", new Date(Date.UTC(2020, 0, 1)))]);
    expect(filtrarHallazgos(h, consulta)).toHaveLength(1);
  });
});

describe("orden natural de «Registro» (#278)", () => {
  it("UDG-CA-2 va antes que UDG-CA-10, en ambos sentidos", () => {
    const hallazgos = [10, 2, 1].map((id) => analizarCalidad({ profesores: [profesor(1)], cuerpos: [cuerpo(id, { liderId: null })] })[0]);
    const asc = analizarListado(LISTADO_CALIDAD, { orden: "registro", dir: "asc" }).consulta;
    const desc = analizarListado(LISTADO_CALIDAD, { orden: "registro", dir: "desc" }).consulta;
    expect(ordenarHallazgos(hallazgos, asc).map((h) => h.registro.slice(0, 9))).toEqual(["UDG-CA-1 ", "UDG-CA-2 ", "UDG-CA-10"]);
    expect(ordenarHallazgos(hallazgos, desc).map((h) => h.registro.slice(0, 9))).toEqual(["UDG-CA-10", "UDG-CA-2 ", "UDG-CA-1 "]);
  });
});
