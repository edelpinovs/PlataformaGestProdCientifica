import { describe, expect, it } from "vitest";
import {
  calcularConteoOficial,
  edicionMetadatosBandejaEsquema,
  ETIQUETA_ESTADO_AUTORIA,
  ETIQUETA_FUENTE,
  puedeGestionarAutoria,
  validarTransicionAutoria,
  type AutoriaParaConteo,
} from "./bandeja";

describe("RF-024 y RF-025: Bandeja de validación y conteo oficial", () => {
  describe("transiciones de estado de autoría (RF-024)", () => {
    it("permite confirmar autoría desde PENDIENTE a VALIDADA", () => {
      const res = validarTransicionAutoria("PENDIENTE", "VALIDADA");
      expect(res.valida).toBe(true);
    });

    it("permite rechazar por homónimo desde PENDIENTE a RECHAZADA", () => {
      const res = validarTransicionAutoria("PENDIENTE", "RECHAZADA");
      expect(res.valida).toBe(true);
    });

    it("permite mantener el mismo estado (idempotencia)", () => {
      expect(validarTransicionAutoria("VALIDADA", "VALIDADA").valida).toBe(true);
      expect(validarTransicionAutoria("PENDIENTE", "PENDIENTE").valida).toBe(true);
      expect(validarTransicionAutoria("RECHAZADA", "RECHAZADA").valida).toBe(true);
    });

    it("permite corregir una autoría previamente rechazada si fue un error", () => {
      const res = validarTransicionAutoria("RECHAZADA", "VALIDADA");
      expect(res.valida).toBe(true);
    });

    it("dispone de etiquetas descriptivas para estados y fuentes", () => {
      expect(ETIQUETA_ESTADO_AUTORIA.PENDIENTE).toBe("Pendiente de validación");
      expect(ETIQUETA_ESTADO_AUTORIA.VALIDADA).toContain("conteo oficial");
      expect(ETIQUETA_ESTADO_AUTORIA.RECHAZADA).toContain("homónimo");

      expect(ETIQUETA_FUENTE.ORCID).toBe("ORCID");
      expect(ETIQUETA_FUENTE.SCOPUS).toBe("Scopus");
      expect(ETIQUETA_FUENTE.OPENALEX).toBe("OpenAlex");
      expect(ETIQUETA_FUENTE.MANUAL).toBe("Captura manual");
    });
  });

  describe("cálculo de conteo oficial (RF-025)", () => {
    const autoriasEjemplo: AutoriaParaConteo[] = [
      { estado: "VALIDADA", profesorId: 1, departamentoId: 100 },
      { estado: "VALIDADA", profesorId: 1, departamentoId: 100 },
      { estado: "VALIDADA", profesorId: 2, departamentoId: 100 },
      { estado: "VALIDADA", profesorId: 3, departamentoId: 200 },
      { estado: "PENDIENTE", profesorId: 1, departamentoId: 100 },
      { estado: "PENDIENTE", profesorId: 2, departamentoId: 100 },
      { estado: "RECHAZADA", profesorId: 1, departamentoId: 100 },
    ];

    it("incorpora al conteo oficial solo las obras en estado VALIDADA", () => {
      const conteo = calcularConteoOficial(autoriasEjemplo);

      expect(conteo.totalValidadas).toBe(4);
      expect(conteo.totalPendientes).toBe(2);
      expect(conteo.totalRechazadas).toBe(1);

      // Conteo por profesor
      expect(conteo.porProfesor[1]).toBe(2);
      expect(conteo.porProfesor[2]).toBe(1);
      expect(conteo.porProfesor[3]).toBe(1);

      // Conteo por departamento
      expect(conteo.porDepartamento[100]).toBe(3); // prof 1 (2) + prof 2 (1)
      expect(conteo.porDepartamento[200]).toBe(1); // prof 3 (1)
    });

    it("maneja correctamente listas vacías sin errores", () => {
      const conteo = calcularConteoOficial([]);
      expect(conteo.totalValidadas).toBe(0);
      expect(conteo.totalPendientes).toBe(0);
      expect(conteo.totalRechazadas).toBe(0);
      expect(Object.keys(conteo.porProfesor)).toHaveLength(0);
      expect(Object.keys(conteo.porDepartamento)).toHaveLength(0);
    });
  });

  describe("edición de metadatos desde bandeja (RF-024)", () => {
    it("valida metadatos correctos", () => {
      const res = edicionMetadatosBandejaEsquema.safeParse({
        publicacionId: 45,
        tipo: "ARTICULO",
        titulo: "Título Corregido de Artículo",
        autoresTexto: "Profesor A; Profesor B",
        revistaEditorial: "IEEE Transactions",
        doi: "10.1109/test.2026.1",
      });
      expect(res.success).toBe(true);
    });

    it("rechaza título corto o vacío", () => {
      const res = edicionMetadatosBandejaEsquema.safeParse({
        publicacionId: 45,
        tipo: "ARTICULO",
        titulo: "  ",
        autoresTexto: "Profesor A",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("título");
      }
    });

    it("normaliza DOI automáticamente si viene con prefijo url", () => {
      const res = edicionMetadatosBandejaEsquema.safeParse({
        publicacionId: 45,
        tipo: "ARTICULO",
        titulo: "Título Válido",
        autoresTexto: "Profesor A",
        doi: "https://doi.org/10.1000/182",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.doi).toBe("10.1000/182");
      }
    });
  });

  describe("permisos de gestión de autorías (puedeGestionarAutoria)", () => {
    it("permite a administradores gestionar cualquier autoría", () => {
      expect(puedeGestionarAutoria({ rol: "ADMINISTRADOR" }, 10)).toBe(true);
      expect(puedeGestionarAutoria({ rol: "ADMINISTRADOR", profesorId: null }, [1, 2])).toBe(true);
    });

    it("permite a coordinadores gestionar cualquier autoría", () => {
      expect(puedeGestionarAutoria({ rol: "COORDINADOR" }, 25)).toBe(true);
      expect(puedeGestionarAutoria({ rol: "COORDINADOR", profesorId: 10 }, [10, 20])).toBe(true);
    });

    it("permite a un docente gestionar su propia autoría", () => {
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: 42 }, 42)).toBe(true);
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: 42 }, [10, 42, 99])).toBe(true);
    });

    it("impide a un docente gestionar autorías de otros profesores", () => {
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: 42 }, 99)).toBe(false);
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: 42 }, [1, 2, 3])).toBe(false);
    });

    it("impide a un docente sin profesorId asociado gestionar cualquier autoría", () => {
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: null }, 10)).toBe(false);
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: undefined }, 10)).toBe(false);
      expect(puedeGestionarAutoria({ rol: "DOCENTE" }, [10])).toBe(false);
    });

    it("rechaza roles no autorizados", () => {
      expect(puedeGestionarAutoria({ rol: "INVITADO" }, 10)).toBe(false);
    });
  });
});
