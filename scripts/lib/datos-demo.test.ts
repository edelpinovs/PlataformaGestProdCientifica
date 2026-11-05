import { describe, expect, it } from "vitest";
import {
  ANIO_CONVOCATORIA_DEMO,
  CANTIDAD_PROFESORES,
  DEPARTAMENTOS_BASE,
  DOMINIO_DEMO,
  MARCA_TITULO,
  PREFIJO_CA,
  PREFIJO_CODIGO,
  PREFIJO_DOI,
  PREFIJO_PE,
  dia,
  generarDatosDemo,
} from "./datos-demo";

// Dos periodos se traslapan si comparten al menos un día (inclusivo), como en RF-011.
const seTraslapan = (a: { inicio: Date; fin: Date }, b: { inicio: Date; fin: Date }) => a.inicio <= b.fin && b.inicio <= a.fin;
const hoy = new Date("2026-11-05T15:00:00.000Z");
const datos = generarDatosDemo(hoy);
const repetidos = (valores: (string | null)[]) => {
  const reales = valores.filter((v): v is string => v !== null);
  return reales.length - new Set(reales).size;
};
const porIndice = new Map(datos.profesores.map((p) => [p.indice, p]));

describe("datos de demostración", () => {
  it("es determinista: la misma fecha da los mismos datos", () => {
    expect(generarDatosDemo(hoy)).toEqual(datos);
  });

  it("genera 50 profesores con nombres numerados", () => {
    expect(datos.profesores).toHaveLength(CANTIDAD_PROFESORES);
    expect(datos.profesores[0]).toMatchObject({ nombres: "Nombre 01", codigo: "DEMO001", correo: "profesor01@demo.invalid" });
    expect(datos.profesores[0].apellidos).toMatch(/^Apellido 01 Apellido \d{2}$/);
  });

  it("marca todo lo que se puede borrar después", () => {
    for (const p of datos.profesores) {
      expect(p.correo.endsWith(`@${DOMINIO_DEMO}`)).toBe(true);
      expect(p.codigo.startsWith(PREFIJO_CODIGO)).toBe(true);
    }
    for (const c of datos.cuerpos) expect(c.clave.startsWith(PREFIJO_CA)).toBe(true);
    for (const p of datos.programas) expect(p.clave.startsWith(PREFIJO_PE)).toBe(true);
    for (const p of datos.publicaciones) {
      expect(p.titulo.startsWith(MARCA_TITULO)).toBe(true);
      if (p.doi) expect(p.doi.startsWith(PREFIJO_DOI)).toBe(true);
    }
    expect(ANIO_CONVOCATORIA_DEMO).toBe(1999);
  });

  it("no repite códigos, correos ni identificadores únicos", () => {
    expect(repetidos(datos.profesores.map((p) => p.codigo))).toBe(0);
    expect(repetidos(datos.profesores.map((p) => p.correo))).toBe(0);
    expect(repetidos(datos.profesores.map((p) => p.cvu))).toBe(0);
    expect(repetidos(datos.profesores.map((p) => p.orcid))).toBe(0);
    expect(repetidos(datos.profesores.map((p) => p.scopusId))).toBe(0);
    expect(repetidos(datos.profesores.map((p) => p.scholarId))).toBe(0);
    expect(repetidos(datos.publicaciones.map((p) => p.doi))).toBe(0);
    expect(repetidos(datos.cuerpos.map((c) => c.clave))).toBe(0);
    expect(repetidos(datos.programas.map((p) => p.clave))).toBe(0);
  });

  it("tiene variedad para ver la interfaz", () => {
    const tc = datos.profesores.filter((p) => p.tipoContratacion === "TIEMPO_COMPLETO").length;
    expect(tc).toBe(35);
    expect(new Set(datos.profesores.map((p) => p.estatusLaboral)).size).toBe(5);
    expect(datos.profesores.some((p) => p.departamento === null)).toBe(true);
    expect(datos.profesores.some((p) => p.grado === null)).toBe(true);
    expect(datos.profesores.some((p) => p.nombres.length > 60)).toBe(true);
    expect(datos.profesores.some((p) => /[ñÁ]/.test(p.nombres + p.apellidos))).toBe(true);
    expect(new Set(datos.publicaciones.map((p) => p.tipo)).size).toBe(7);
    expect(new Set(datos.publicaciones.map((p) => p.fuente)).size).toBe(5);
    expect(datos.publicaciones.some((p) => p.doi === null)).toBe(true);
    expect(new Set(datos.autorias.map((a) => a.estado)).size).toBe(3);
  });

  it("el CVU es solo de dígitos (regla del RF-007)", () => {
    for (const p of datos.profesores) if (p.cvu) expect(p.cvu).toMatch(/^\d+$/);
  });

  describe("SNII", () => {
    it("tiene 18 reconocimientos, todos de profesores existentes y con inicio anterior al fin", () => {
      expect(datos.snii).toHaveLength(18);
      for (const s of datos.snii) {
        expect(porIndice.has(s.profesor)).toBe(true);
        expect(s.inicio < s.fin).toBe(true);
      }
    });
    it("ningún profesor tiene periodos que se traslapen (los que otorgan vigencia)", () => {
      for (const profesor of new Set(datos.snii.map((s) => s.profesor))) {
        const propios = datos.snii.filter((s) => s.profesor === profesor && s.resultado !== "NO_APROBADO");
        propios.forEach((actual, i) => {
          propios.slice(i + 1).forEach((otro) => expect(seTraslapan(actual, otro), `profesor ${profesor}`).toBe(false));
        });
      }
    });
    it("cubre vigente, por vencer, termina hoy, vencido, no aprobado y reconsideración", () => {
      const fines = datos.snii.map((s) => s.fin.getTime());
      expect(fines).toContain(dia(hoy, 0).getTime());
      expect(fines).toContain(dia(hoy, 30).getTime());
      expect(datos.snii.some((s) => s.fin < dia(hoy, 0))).toBe(true);
      expect(datos.snii.some((s) => s.inicio <= dia(hoy, 0) && s.fin > dia(hoy, 30))).toBe(true);
      expect(datos.snii.filter((s) => s.resultado === "NO_APROBADO")).toHaveLength(2);
      expect(datos.snii.filter((s) => s.resultado === "EN_RECONSIDERACION")).toHaveLength(2);
    });
    it("un solo reconocimiento forma parte de una convocatoria oficial", () => {
      expect(datos.snii.filter((s) => s.conConvocatoria)).toHaveLength(1);
    });
    it("el resultado concuerda con el nivel", () => {
      for (const s of datos.snii) {
        if (s.nivel === "NO_APROBADO") expect(s.resultado).toBe("NO_APROBADO");
      }
    });
  });

  describe("PRODEP", () => {
    it("tiene 10 reconocimientos, uno por profesor, de tiempo completo", () => {
      expect(datos.prodep).toHaveLength(10);
      expect(new Set(datos.prodep.map((p) => p.profesor)).size).toBe(10);
      for (const p of datos.prodep) {
        expect(porIndice.get(p.profesor)?.tipoContratacion).toBe("TIEMPO_COMPLETO");
        expect(p.inicio < p.fin).toBe(true);
      }
    });
    it("incluye vigentes, vencido, reconsideración y no aprobado", () => {
      const vigente = (p: (typeof datos.prodep)[number]) => p.resultado === "APROBADO" && p.inicio <= hoy && p.fin >= dia(hoy, 0);
      expect(datos.prodep.filter(vigente).length).toBeGreaterThanOrEqual(7);
      expect(datos.prodep.some((p) => p.resultado === "APROBADO" && p.fin < dia(hoy, 0))).toBe(true);
      expect(datos.prodep.some((p) => p.resultado === "EN_RECONSIDERACION")).toBe(true);
      expect(datos.prodep.some((p) => p.resultado === "NO_APROBADO")).toBe(true);
    });
  });

  describe("cuerpos académicos", () => {
    it("hay 6, uno por departamento", () => {
      expect(datos.cuerpos.map((c) => c.departamento)).toEqual([...DEPARTAMENTOS_BASE]);
    });
    it("los integrantes son de tiempo completo, activos y de su departamento", () => {
      for (const c of datos.cuerpos) {
        for (const i of c.integrantes) {
          const p = porIndice.get(i)!;
          expect(p.tipoContratacion).toBe("TIEMPO_COMPLETO");
          expect(p.estatusLaboral).toBe("ACTIVO");
          expect(p.departamento).toBe(c.departamento);
        }
      }
    });
    it("tiene el tamaño previsto: 4, 3, 4, 4, 3 y 0 integrantes", () => {
      expect(datos.cuerpos.map((c) => c.integrantes.length)).toEqual([4, 3, 4, 4, 3, 0]);
    });
    it("el líder es integrante; el 5 no tiene líder y el 6 no tiene integrantes", () => {
      for (const c of datos.cuerpos) if (c.lider !== null) expect(c.integrantes).toContain(c.lider);
      expect(datos.cuerpos[4].lider).toBeNull();
      expect(datos.cuerpos[5].integrantes).toHaveLength(0);
    });
    it("cada cuerpo con integrantes tiene al menos uno con PRODEP vigente (RF-013)", () => {
      const vigentes = new Set(
        datos.prodep.filter((p) => p.resultado === "APROBADO" && p.inicio <= hoy && p.fin >= dia(hoy, 0)).map((p) => p.profesor),
      );
      for (const c of datos.cuerpos.filter((x) => x.integrantes.length > 0)) {
        expect(c.integrantes.some((i) => vigentes.has(i)), c.clave).toBe(true);
      }
    });
    it("las LGAC vinculan solo integrantes, no repiten nombre y tienen al menos uno", () => {
      for (const c of datos.cuerpos) {
        expect(repetidos(c.lgacs.map((l) => l.nombre))).toBe(0);
        for (const l of c.lgacs) {
          expect(l.profesores.length).toBeGreaterThan(0);
          for (const p of l.profesores) expect(c.integrantes).toContain(p);
        }
      }
      expect(datos.cuerpos.flatMap((c) => c.lgacs)).toHaveLength(10);
    });
    it("tiene un cuerpo con vigencia vencida", () => {
      expect(datos.cuerpos.some((c) => c.anioVencimiento < hoy.getUTCFullYear())).toBe(true);
    });
  });

  describe("publicaciones y autorías", () => {
    it("hay 30 publicaciones y las fechas no son futuras", () => {
      expect(datos.publicaciones).toHaveLength(30);
      for (const p of datos.publicaciones) if (p.fechaPublicacion) expect(p.fechaPublicacion <= hoy).toBe(true);
    });
    it("las autorías son de profesores y publicaciones existentes y no se repiten", () => {
      const pares = datos.autorias.map((a) => `${a.publicacion}-${a.profesor}`);
      expect(new Set(pares).size).toBe(pares.length);
      for (const a of datos.autorias) {
        expect(porIndice.has(a.profesor)).toBe(true);
        expect(a.publicacion).toBeGreaterThanOrEqual(1);
        expect(a.publicacion).toBeLessThanOrEqual(30);
      }
      expect(datos.autorias.length).toBeGreaterThanOrEqual(50);
    });
    it("solo las pendientes carecen de fecha de revisión", () => {
      for (const a of datos.autorias) expect(a.revisadaEn === null).toBe(a.estado === "PENDIENTE");
    });
    it("las manuales traen evidencia con dirección http o https", () => {
      for (const p of datos.publicaciones.filter((x) => x.fuente === "MANUAL")) expect(p.evidenciaUrl).toMatch(/^https?:\/\//);
    });
  });
});
