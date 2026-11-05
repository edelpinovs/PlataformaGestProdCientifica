import { describe, expect, it } from "vitest";
import {
  agruparCandidatos,
  altaIntegrante,
  revisarAltaIntegrante,
  revisarBajaIntegrante,
  revisarCambioIntegrante,
  tieneProdepActivo,
} from "./integrantes";

const hoy = new Date("2026-10-29T12:00:00Z");

const conProdep = {
  id: 1,
  nombres: "Ana",
  apellidos: "López",
  codigo: "TC01",
  tipoContratacion: "TIEMPO_COMPLETO" as const,
  estatusLaboral: "ACTIVO",
  prodepActivo: true,
};

const sinProdep = {
  id: 2,
  nombres: "Luis",
  apellidos: "Pérez",
  codigo: "TC02",
  tipoContratacion: "TIEMPO_COMPLETO" as const,
  estatusLaboral: "ACTIVO",
  prodepActivo: false,
};

const asignatura = {
  id: 3,
  nombres: "Marta",
  apellidos: "Ruiz",
  codigo: "AS01",
  tipoContratacion: "ASIGNATURA" as const,
  estatusLaboral: "ACTIVO",
  prodepActivo: true,
};

const dadoDeBaja = {
  ...conProdep,
  id: 5,
  nombres: "Nora",
  apellidos: "Gil",
  codigo: "TC05",
  estatusLaboral: "BAJA_TEMPORAL",
};

const sinProdep3 = {
  ...sinProdep,
  id: 3,
  nombres: "Eva",
  apellidos: "Soto",
  codigo: "TC03",
};

const atascado = [
  { profesorId: 1, nombre: "López Ana (TC01)", prodepActivo: false },
  { profesorId: 2, nombre: "Pérez Luis (TC02)", prodepActivo: false },
];

const integrantesConProdep = [
  { profesorId: 1, nombre: "López Ana (TC01)", prodepActivo: true },
];

describe("tieneProdepActivo (RF-013)", () => {
  it("es verdadero si hay un dictamen aprobado vigente", () => {
    expect(
      tieneProdepActivo(
        [{ resultado: "APROBADO", inicio: new Date("2024-01-01"), fin: new Date("2027-12-31") }],
        hoy,
      ),
    ).toBe(true);
  });

  it("es verdadero el primer y el último día de la vigencia", () => {
    const periodo = [{ resultado: "APROBADO", inicio: hoy, fin: hoy }];
    expect(tieneProdepActivo(periodo, hoy)).toBe(true);
  });

  it("es falso si ya venció, si aún no inicia o si no fue aprobado", () => {
    expect(
      tieneProdepActivo(
        [{ resultado: "APROBADO", inicio: new Date("2020-01-01"), fin: new Date("2025-12-31") }],
        hoy,
      ),
    ).toBe(false);
    expect(
      tieneProdepActivo(
        [{ resultado: "APROBADO", inicio: new Date("2027-01-01"), fin: new Date("2029-12-31") }],
        hoy,
      ),
    ).toBe(false);
    expect(
      tieneProdepActivo(
        [{ resultado: "NO_APROBADO", inicio: new Date("2024-01-01"), fin: new Date("2027-12-31") }],
        hoy,
      ),
    ).toBe(false);
    expect(tieneProdepActivo([], hoy)).toBe(false);
  });
});

describe("altaIntegrante (RF-013)", () => {
  it("exige un profesor", () => {
    const resultado = altaIntegrante.safeParse({ cuerpoId: "1", profesorId: "" });
    expect(resultado.success).toBe(false);
  });

  it("convierte los identificadores a número", () => {
    expect(altaIntegrante.parse({ cuerpoId: "4", profesorId: "12" })).toEqual({ cuerpoId: 4, profesorId: 12 });
  });
});

describe("revisarAltaIntegrante (RF-013)", () => {
  it("acepta al primer integrante si tiene PRODEP activo", () => {
    expect(revisarAltaIntegrante(conProdep, [])).toBeNull();
  });

  it("rechaza al primer integrante si no tiene PRODEP activo", () => {
    expect(revisarAltaIntegrante(sinProdep, [])).toEqual({
      campo: "profesorId",
      mensaje: "Al menos un integrante debe tener Perfil Deseable PRODEP activo.",
    });
  });

  it("acepta a alguien sin PRODEP si ya hay un integrante con PRODEP", () => {
    expect(revisarAltaIntegrante(sinProdep, integrantesConProdep)).toBeNull();
  });

  it("rechaza a un profesor de asignatura", () => {
    expect(revisarAltaIntegrante(asignatura, [])).toEqual({
      campo: "profesorId",
      mensaje: "Ruiz Marta (AS01) no es de tiempo completo. Elige a otra persona.",
    });
  });

  it("rechaza a un profesor de tiempo completo que no está activo", () => {
    expect(revisarAltaIntegrante(dadoDeBaja, [])).toEqual({
      campo: "profesorId",
      mensaje: "Gil Nora (TC05) no está en estatus laboral activo. Elige a otra persona.",
    });
  });

  it("permite agregar a alguien sin PRODEP si el CA ya no tenía PRODEP vigente", () => {
    expect(revisarAltaIntegrante(sinProdep3, atascado)).toBeNull();
  });

  it("rechaza a quien ya es integrante", () => {
    expect(revisarAltaIntegrante(conProdep, integrantesConProdep)).toEqual({
      campo: "profesorId",
      mensaje: "López Ana (TC01) ya es integrante de este cuerpo académico.",
    });
  });

  it("rechaza a un profesor que ya no está en el directorio", () => {
    expect(revisarAltaIntegrante(undefined, [])).toEqual({
      campo: "profesorId",
      mensaje: "Ese profesor ya no está en el directorio. Recarga la página.",
    });
  });
});

describe("revisarBajaIntegrante (RF-013)", () => {
  it("permite quitar al único integrante", () => {
    expect(revisarBajaIntegrante(1, integrantesConProdep)).toBeNull();
  });

  it("permite quitar a quien no tiene PRODEP si queda otro con PRODEP", () => {
    const dos = [
      ...integrantesConProdep,
      { profesorId: 2, nombre: "Pérez Luis (TC02)", prodepActivo: false },
    ];
    expect(revisarBajaIntegrante(2, dos)).toBeNull();
  });

  it("no permite quitar al único integrante con PRODEP si quedan otros", () => {
    const dos = [
      ...integrantesConProdep,
      { profesorId: 2, nombre: "Pérez Luis (TC02)", prodepActivo: false },
    ];
    expect(revisarBajaIntegrante(1, dos)).toBe(
      "No se puede quitar a López Ana (TC01): el cuerpo académico se quedaría sin un integrante con PRODEP activo.",
    );
  });

  it("explica si esa persona ya no es integrante", () => {
    expect(revisarBajaIntegrante(9, integrantesConProdep)).toBe(
      "Esa persona ya no es integrante. Recarga la página.",
    );
  });

  it("permite quitar a cualquiera si el PRODEP ya no está vigente", () => {
    expect(revisarBajaIntegrante(1, atascado)).toBeNull();
    expect(revisarBajaIntegrante(2, atascado)).toBeNull();
  });

  it("permite quitar al único integrante aunque no tenga PRODEP", () => {
    expect(revisarBajaIntegrante(1, [{ profesorId: 1, nombre: "López Ana (TC01)", prodepActivo: false }])).toBeNull();
  });
});

describe("agruparCandidatos (RF-013)", () => {
  it("separa a quienes tienen PRODEP vigente", () => {
    const candidatos = [
      { id: 2, prodepActivo: false },
      { id: 1, prodepActivo: true },
      { id: 3, prodepActivo: false },
    ];
    expect(agruparCandidatos(candidatos)).toEqual({
      conProdep: [{ id: 1, prodepActivo: true }],
      sinProdep: [
        { id: 2, prodepActivo: false },
        { id: 3, prodepActivo: false },
      ],
    });
  });
});

describe("revisarCambioIntegrante (#59)", () => {
  it("un integrante puede conservarse a sí mismo", () => {
    expect(revisarCambioIntegrante(1, conProdep, integrantesConProdep)).toBeNull();
  });

  it("no puede tomar a quien ya es integrante", () => {
    const dos = [
      ...integrantesConProdep,
      { profesorId: 2, nombre: "Pérez Luis (TC02)", prodepActivo: false },
    ];
    expect(revisarCambioIntegrante(2, conProdep, dos)?.mensaje).toMatch(/ya es integrante/);
  });

  it("no puede dejar al CA sin PRODEP activo si aún lo tenía", () => {
    expect(revisarCambioIntegrante(1, sinProdep, integrantesConProdep)).toEqual({
      campo: "profesorId",
      mensaje: "Al menos un integrante debe tener Perfil Deseable PRODEP activo.",
    });
  });

  it("permite editar o cambiar cuando el PRODEP ya había vencido", () => {
    expect(revisarCambioIntegrante(1, { ...conProdep, prodepActivo: false }, atascado)).toBeNull();
    expect(revisarCambioIntegrante(1, sinProdep3, atascado)).toBeNull();
  });

  it("rechaza el cambio a un profesor que no está activo", () => {
    expect(revisarCambioIntegrante(1, dadoDeBaja, integrantesConProdep)?.mensaje).toMatch(
      /no está en estatus laboral activo/,
    );
  });
});
