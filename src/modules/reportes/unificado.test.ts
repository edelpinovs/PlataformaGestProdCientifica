import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { PublicacionConsolidada } from "../produccion/tipos";
import {
  COLUMNAS_PUBLICACION_PROFESOR,
  COLUMNAS_REPORTE_UNIFICADO,
  COLUMNAS_RESUMEN_PROFESOR,
  convertirConsolidadasAReporte,
  generarReporteUnificadoExcel,
} from "./unificado";

describe("Reporte Unificado de Producción Científica (RF-020, RF-026)", () => {
  const catalogoProfesores = new Map([
    [
      1,
      {
        nombres: "Himer",
        apellidos: "Ávila-George",
        scopusId: "57200000001",
        orcid: "0000-0001-2345-6789",
        indiceH: 18,
      },
    ],
    [
      2,
      {
        nombres: "Roberto",
        apellidos: "Morales-Vázquez",
        scopusId: "57200000002",
        orcid: "0000-0002-9876-5432",
        indiceH: 12,
      },
    ],
  ]);

  const publicacionesEjemplo: PublicacionConsolidada[] = [
    {
      titulo: "Deep Learning for Smart Cities",
      tituloNormalizado: "deep learning for smart cities",
      doi: "10.1016/j.scs.2023.1001",
      autoresTexto: "Ávila-George, Himer; Morales-Vázquez, Roberto",
      revistaEditorial: "Sustainable Cities and Society",
      isbnIssn: "22106707",
      fechaPublicacion: new Date("2023-05-15T00:00:00.000Z"),
      anio: 2023,
      volumen: "95",
      paginas: "1001-1015",
      evidenciaUrl: "https://doi.org/10.1016/j.scs.2023.1001",
      fuentePrincipal: "SCOPUS",
      fuentesDetectadas: ["SCOPUS", "OPENALEX"],
      profesoresIds: [1, 2], // Coautoría
      citas: 35,
      cuartil: "Q1",
      tipo: "ARTICULO",
    },
    {
      titulo: "Optimization in Edge Computing",
      tituloNormalizado: "optimization in edge computing",
      doi: "10.1109/ACCESS.2023.2002",
      autoresTexto: "Ávila-George, Himer",
      revistaEditorial: "IEEE Access",
      isbnIssn: "21693536",
      fechaPublicacion: new Date("2023-08-10T00:00:00.000Z"),
      anio: 2023,
      volumen: "11",
      paginas: "50-60",
      evidenciaUrl: "https://doi.org/10.1109/ACCESS.2023.2002",
      fuentePrincipal: "OPENALEX",
      fuentesDetectadas: ["OPENALEX"],
      profesoresIds: [1],
      citas: 8,
      cuartil: "Q2",
      tipo: "ARTICULO",
    },
  ];

  describe("convertirConsolidadasAReporte", () => {
    it("convierte publicaciones consolidadas al formato de 3 tablas", () => {
      const reporte = convertirConsolidadasAReporte(publicacionesEjemplo, catalogoProfesores, "2026-11-02");

      // 1. Hoja Reporte Unificado
      expect(reporte.publicaciones).toHaveLength(2);
      const pub1 = reporte.publicaciones[0];
      expect(pub1.titulo).toBe("Deep Learning for Smart Cities");
      expect(pub1.doi).toBe("10.1016/j.scs.2023.1001");
      expect(pub1.anio).toBe(2023);
      expect(pub1.cuartilScopus).toBe("Q1");
      expect(pub1.numeroCitas).toBe(35);
      expect(pub1.indexada).toBe("Sí");
      expect(pub1.baseIndexacion).toBe("SCOPUS; OPENALEX");
      expect(pub1.autorPrincipal).toBe("Ávila-George, Himer");
      expect(pub1.indiceH).toBe(18); // max entre 18 y 12

      // 2. Hoja Publicación-Profesor (debe tener 3 filas porque la primera es coautoría entre 2 profesores)
      expect(reporte.relaciones).toHaveLength(3);
      expect(reporte.relaciones[0].profesor).toBe("Ávila-George, Himer");
      expect(reporte.relaciones[1].profesor).toBe("Morales-Vázquez, Roberto");
      expect(reporte.relaciones[2].profesor).toBe("Ávila-George, Himer");

      // 3. Hoja Resumen por profesor
      expect(reporte.resumen).toHaveLength(2);
      const resProf1 = reporte.resumen.find((r) => r.profesor.includes("Ávila-George"));
      expect(resProf1).toBeDefined();
      expect(resProf1?.totalPublicaciones).toBe(2);
      expect(resProf1?.scopus).toBe(1);
      expect(resProf1?.openAlex).toBe(2);
      expect(resProf1?.indiceH).toBe(18);

      const resProf2 = reporte.resumen.find((r) => r.profesor.includes("Morales-Vázquez"));
      expect(resProf2).toBeDefined();
      expect(resProf2?.totalPublicaciones).toBe(1);
      expect(resProf2?.scopus).toBe(1);
      expect(resProf2?.indiceH).toBe(12);
    });
  });

  describe("generarReporteUnificadoExcel", () => {
    it("produce un archivo Excel válido con las 3 hojas idénticas a Python", async () => {
      const datos = convertirConsolidadasAReporte(publicacionesEjemplo, catalogoProfesores);
      const buffer = await generarReporteUnificadoExcel(datos);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);

      // Cargar el workbook resultante para validar su estructura interna
      const wb = new ExcelJS.Workbook();
      // @ts-expect-error - ExcelJS load acepta Buffer
      await wb.xlsx.load(buffer);

      const hojas = wb.worksheets.map((s) => s.name);
      expect(hojas).toEqual([
        "Reporte unificado",
        "Publicación-Profesor",
        "Resumen por profesor",
      ]);

      // Verificar encabezados de la Hoja 1
      const hoja1 = wb.getWorksheet("Reporte unificado")!;
      const headers1: string[] = [];
      hoja1.getRow(1).eachCell((cell) => headers1.push(String(cell.value)));
      expect(headers1).toEqual([...COLUMNAS_REPORTE_UNIFICADO]);
      expect(hoja1.rowCount).toBe(3); // 1 header + 2 filas de datos

      // Verificar encabezados de la Hoja 2
      const hoja2 = wb.getWorksheet("Publicación-Profesor")!;
      const headers2: string[] = [];
      hoja2.getRow(1).eachCell((cell) => headers2.push(String(cell.value)));
      expect(headers2).toEqual([...COLUMNAS_PUBLICACION_PROFESOR]);
      expect(hoja2.rowCount).toBe(4); // 1 header + 3 relaciones

      // Verificar encabezados de la Hoja 3
      const hoja3 = wb.getWorksheet("Resumen por profesor")!;
      const headers3: string[] = [];
      hoja3.getRow(1).eachCell((cell) => headers3.push(String(cell.value)));
      expect(headers3).toEqual([...COLUMNAS_RESUMEN_PROFESOR]);
      expect(hoja3.rowCount).toBe(3); // 1 header + 2 profesores
    });
  });
});

