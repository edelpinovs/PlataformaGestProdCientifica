import { describe, expect, it } from "vitest";
import {
  ETIQUETAS_TIPO,
  motivoNoEliminablePublicacion,
  normalizar,
  normalizarDoi,
  publicacionManualEsquema,
  revisarPublicacionManual,
  TIPOS_PUBLICACION,
  type ContextoValidacionManual,
  type PublicacionManualDatos,
} from "./manual";

describe("RF-023: Captura manual de publicaciones", () => {
  const datosValidos: PublicacionManualDatos = {
    tipo: "ARTICULO",
    titulo: "Avances en Inteligencia Artificial y Machine Learning",
    autoresTexto: "García, Juan; Rodríguez, Ana",
    fechaPublicacion: "2026-05-15",
    revistaEditorial: "Revista Iberoamericana de Computación",
    isbnIssn: "1234-5678",
    doi: "10.1016/j.artint.2026.01.001",
    volumen: "42",
    paginas: "115-128",
    evidenciaUrl: "https://ejemplo.udg.mx/articulos/ia-2026.pdf",
    profesorId: 10,
  };

  const contextoBase: ContextoValidacionManual = {
    profesores: [
      { id: 10, nombres: "Juan Carlos", apellidos: "García" },
      { id: 20, nombres: "Ana María", apellidos: "Rodríguez" },
    ],
    publicacionesExistentes: [
      {
        id: 1,
        doi: "10.1000/182",
        tituloNormalizado: "sistemas distribuidos y tolerancia a fallos",
        autorias: [{ profesorId: 10 }],
      },
    ],
  };

  describe("normalizadores", () => {
    it("normaliza títulos quitando acentos, mayúsculas y espacios redundantes", () => {
      expect(normalizar("  Optimización   de Algoritmos  Genéticos  ")).toBe(
        "optimizacion de algoritmos geneticos",
      );
      expect(normalizar("Áéíóú ñ")).toBe("aeiou n");
    });

    it("normaliza DOI quitando prefijos de URL y mayúsculas", () => {
      expect(normalizarDoi("https://doi.org/10.1016/J.ARTINT.2026")).toBe(
        "10.1016/j.artint.2026",
      );
      expect(normalizarDoi("http://dx.doi.org/10.1000/182")).toBe("10.1000/182");
      expect(normalizarDoi("doi: 10.1000/182 ")).toBe("10.1000/182");
      expect(normalizarDoi("")).toBeNull();
      expect(normalizarDoi(null)).toBeNull();
    });
  });

  describe("esquema Zod (publicacionManualEsquema)", () => {
    it("acepta una publicación completa con todos los campos válidos", () => {
      const res = publicacionManualEsquema.safeParse(datosValidos);
      expect(res.success).toBe(true);
    });

    it("acepta los tipos de publicación reconocidos por el modelo", () => {
      for (const tipo of TIPOS_PUBLICACION) {
        expect(ETIQUETAS_TIPO[tipo]).toBeDefined();
        const res = publicacionManualEsquema.safeParse({ ...datosValidos, tipo });
        expect(res.success).toBe(true);
      }
    });

    it("rechaza un tipo de publicación no reconocido", () => {
      const res = publicacionManualEsquema.safeParse({ ...datosValidos, tipo: "INVENTADO" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("tipo de publicación");
      }
    });

    it("rechaza un título vacío o menor a 3 caracteres", () => {
      const vacio = publicacionManualEsquema.safeParse({ ...datosValidos, titulo: "   " });
      expect(vacio.success).toBe(false);

      const corto = publicacionManualEsquema.safeParse({ ...datosValidos, titulo: "ab" });
      expect(corto.success).toBe(false);
      if (!corto.success) {
        expect(corto.error.issues[0].message).toContain("al menos 3 caracteres");
      }
    });

    it("rechaza autores vacíos o menores a 3 caracteres", () => {
      const res = publicacionManualEsquema.safeParse({ ...datosValidos, autoresTexto: "  " });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("autores");
      }
    });

    it("acepta campos opcionales omitidos o vacíos", () => {
      const res = publicacionManualEsquema.safeParse({
        tipo: "LIBRO",
        titulo: "Manual de Bioestadística",
        autoresTexto: "López, M.",
        profesorId: 10,
        fechaPublicacion: "",
        revistaEditorial: "",
        isbnIssn: "",
        doi: "",
        volumen: "",
        paginas: "",
        evidenciaUrl: "",
      });
      expect(res.success).toBe(true);
    });

    it("valida formato de fecha AAAA-MM-DD si se proporciona", () => {
      const malaFecha = publicacionManualEsquema.safeParse({
        ...datosValidos,
        fechaPublicacion: "15/05/2026",
      });
      expect(malaFecha.success).toBe(false);

      const buenaFecha = publicacionManualEsquema.safeParse({
        ...datosValidos,
        fechaPublicacion: "2026-05-15",
      });
      expect(buenaFecha.success).toBe(true);
    });

    it("valida formato de DOI si se proporciona", () => {
      const invalido = publicacionManualEsquema.safeParse({
        ...datosValidos,
        doi: "este-no-es-doi",
      });
      expect(invalido.success).toBe(false);
      if (!invalido.success) {
        expect(invalido.error.issues[0].message).toContain("DOI");
      }
    });

    it("valida que la URL de evidencia sea válida si se envía", () => {
      const malaUrl = publicacionManualEsquema.safeParse({
        ...datosValidos,
        evidenciaUrl: "no-es-url",
      });
      expect(malaUrl.success).toBe(false);

      const buenaUrl = publicacionManualEsquema.safeParse({
        ...datosValidos,
        evidenciaUrl: "https://repositorio.udg.mx/handle/12345/678",
      });
      expect(buenaUrl.success).toBe(true);
    });

    it("requiere un profesorId entero positivo", () => {
      const sinProf = publicacionManualEsquema.safeParse({ ...datosValidos, profesorId: 0 });
      expect(sinProf.success).toBe(false);
    });
  });

  describe("reglas de negocio y duplicados (revisarPublicacionManual)", () => {
    it("permite el registro cuando no hay conflictos", () => {
      const problema = revisarPublicacionManual(datosValidos, contextoBase);
      expect(problema).toBeNull();
    });

    it("rechaza si el profesor elegido no existe en el contexto", () => {
      const problema = revisarPublicacionManual(
        { ...datosValidos, profesorId: 999 },
        contextoBase,
      );
      expect(problema).not.toBeNull();
      expect(problema?.campo).toBe("profesorId");
      expect(problema?.mensaje).toContain("no existe en el directorio");
    });

    it("rechaza si el DOI ya está registrado en el sistema", () => {
      const problema = revisarPublicacionManual(
        { ...datosValidos, doi: "https://doi.org/10.1000/182" },
        contextoBase,
      );
      expect(problema).not.toBeNull();
      expect(problema?.campo).toBe("doi");
      expect(problema?.mensaje).toContain("Ya existe una publicación registrada con el DOI");
    });

    it("rechaza si el mismo profesor ya tiene una publicación con el mismo título normalizado", () => {
      const problema = revisarPublicacionManual(
        {
          ...datosValidos,
          profesorId: 10,
          doi: undefined,
          titulo: "  Sistemas Distribuidos y Tolerancia a Fallos  ",
        },
        contextoBase,
      );
      expect(problema).not.toBeNull();
      expect(problema?.campo).toBe("titulo");
      expect(problema?.mensaje).toContain("ya tiene registrada una publicación con este mismo título");
    });

    it("permite que otro profesor registre el mismo título (coautoría independiente)", () => {
      const problema = revisarPublicacionManual(
        {
          ...datosValidos,
          profesorId: 20, // Profesor 20 no lo tiene registrado aún
          doi: undefined,
          titulo: "Sistemas Distribuidos y Tolerancia a Fallos",
        },
        contextoBase,
      );
      expect(problema).toBeNull();
    });

    it("al editar, no choca consigo mismo por DOI o título (idPropio)", () => {
      const problema = revisarPublicacionManual(
        {
          ...datosValidos,
          profesorId: 10,
          doi: "10.1000/182",
          titulo: "Sistemas Distribuidos y Tolerancia a Fallos",
        },
        contextoBase,
        1, // ID propio de la publicación
      );
      expect(problema).toBeNull();
    });
  });

  describe("motivoNoEliminablePublicacion", () => {
    it("impide eliminar publicaciones automáticas", () => {
      const motivo = motivoNoEliminablePublicacion("Artículo 1", 1, false);
      expect(motivo).toContain("escaneo automático");
    });

    it("impide eliminar publicaciones vinculadas a más de un profesor", () => {
      const motivo = motivoNoEliminablePublicacion("Libro Colectivo", 2, true);
      expect(motivo).toContain("múltiples profesores");
    });

    it("permite eliminar una publicación manual con un solo autor", () => {
      const motivo = motivoNoEliminablePublicacion("Artículo Propio", 1, true);
      expect(motivo).toBeNull();
    });
  });
});
