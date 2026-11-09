import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearPdfDePrueba } from "@/modules/convocatorias/pdf-prueba";
import { procesarCarga, TIEMPO_ATASCO_MS, type AlmacenArchivos } from "./procesamiento";

// RF-017: la lectura usa los lectores reales con archivos inventados; solo la base y Storage son dobles.
const dobles = vi.hoisted(() => {
  const prisma = {
    job: { updateMany: vi.fn(), findUnique: vi.fn() },
    cargaResultados: { findUnique: vi.fn(), updateMany: vi.fn() },
    renglonResultado: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});
vi.mock("@/lib/prisma", () => ({ prisma: dobles.prisma }));

type Tarea = { id: number; estado: string; actualizadoEn: Date; datos: unknown; error?: string | null; avance?: number };
let tarea: Tarea;
let carga: { id: number; estado: string; archivoRuta: string; convocatoria: { programa: "SNII" | "PRODEP" } } | null;
let renglones: { cargaId: number }[];
let archivo: Uint8Array | null;
const llamadas: string[] = [];

const ENCABEZADO = ["CVU", "APELLIDO PATERNO", "APELLIDO MATERNO", "NOMBRES", "NIVEL OTORGADO"];

async function excel(personas: number): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Resultados");
  hoja.addRow(ENCABEZADO);
  for (let i = 1; i <= personas; i++) hoja.addRow([900000 + i, "LUNA", "SOL", `PERSONA ${i}`, "Candidato"]);
  return new Uint8Array(await libro.xlsx.writeBuffer());
}

const almacen: AlmacenArchivos = {
  storage: {
    from: () => ({
      download: async () => {
        llamadas.push("descarga");
        return archivo ? { data: new Blob([Buffer.from(archivo)]), error: null } : { data: null, error: new Error("no") };
      },
    }),
  },
};

describe("procesarCarga (RF-017)", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    llamadas.length = 0;
    tarea = { id: 7, estado: "PENDIENTE", actualizadoEn: new Date(), datos: { cargaId: 3, ruta: "snii/2025/x.xlsx" } };
    carga = { id: 3, estado: "PROCESANDO", archivoRuta: "snii/2025/20261109T100000-resultados.xlsx", convocatoria: { programa: "SNII" } };
    renglones = [];
    archivo = await excel(3);

    dobles.prisma.job.findUnique.mockImplementation(async () => ({ ...tarea }));
    dobles.prisma.job.updateMany.mockImplementation(async ({ where, data }) => {
      if (where.OR) {
        const libre = tarea.estado === "PENDIENTE" ||
          (tarea.estado === "EN_PROCESO" && tarea.actualizadoEn < where.OR[1].actualizadoEn.lt);
        if (!libre) return { count: 0 };
      } else if (where.estado !== tarea.estado || where.actualizadoEn?.getTime() !== tarea.actualizadoEn.getTime()) {
        return { count: 0 };
      }
      tarea = { ...tarea, ...data, actualizadoEn: data.actualizadoEn ?? tarea.actualizadoEn };
      return { count: 1 };
    });
    dobles.prisma.cargaResultados.findUnique.mockImplementation(async () => carga && { ...carga });
    dobles.prisma.cargaResultados.updateMany.mockImplementation(async ({ where, data }) => {
      if (!carga || where.id !== carga.id || where.estado !== carga.estado) return { count: 0 };
      carga = { ...carga, ...data };
      return { count: 1 };
    });
    dobles.prisma.renglonResultado.deleteMany.mockImplementation(async ({ where }) => {
      llamadas.push("borra");
      renglones = renglones.filter((r) => r.cargaId !== where.cargaId);
    });
    dobles.prisma.renglonResultado.createMany.mockImplementation(async ({ data }) => {
      llamadas.push("crea");
      renglones.push(...data);
    });
    dobles.prisma.$transaction.mockImplementation(async (fn) => fn(dobles.prisma));
  });

  it("no lee una tarea que otra lectura ya reservó", async () => {
    tarea.estado = "EN_PROCESO";
    await procesarCarga(7, almacen);
    expect(llamadas).toEqual([]);
  });

  it("retoma una tarea atascada más de 10 minutos", async () => {
    tarea = { ...tarea, estado: "EN_PROCESO", actualizadoEn: new Date(Date.now() - TIEMPO_ATASCO_MS - 1000) };
    await procesarCarga(7, almacen);
    expect(tarea.estado).toBe("COMPLETADO");
  });

  it("guarda los renglones, deja la carga en revisión y el resumen en la tarea", async () => {
    await procesarCarga(7, almacen);
    expect(llamadas).toEqual(["descarga", "borra", "crea"]);
    expect(renglones).toHaveLength(3);
    expect(renglones[0]).toMatchObject({ cargaId: 3, numero: 2, cvu: "900001", nombres: "PERSONA 1", nivel: "CANDIDATO" });
    expect(carga?.estado).toBe("EN_REVISION");
    expect(tarea).toMatchObject({ estado: "COMPLETADO", avance: 1, error: null });
    expect(tarea.datos).toMatchObject({ cargaId: 3, resumen: { renglones: 3, conCvu: 3, totalAvisos: 0 } });
  });

  it("guarda en bloques de 1,000 renglones", async () => {
    archivo = await excel(2500);
    await procesarCarga(7, almacen);
    expect(dobles.prisma.renglonResultado.createMany).toHaveBeenCalledTimes(3);
    expect(renglones).toHaveLength(2500);
  });

  it("al volver a leer no duplica los renglones", async () => {
    await procesarCarga(7, almacen);
    tarea = { ...tarea, estado: "PENDIENTE" };
    carga = { ...carga!, estado: "PROCESANDO" };
    await procesarCarga(7, almacen);
    expect(renglones).toHaveLength(3);
  });

  it("marca la carga como fallida si no se puede descargar el archivo", async () => {
    archivo = null;
    await procesarCarga(7, almacen);
    expect(carga?.estado).toBe("FALLIDA");
    expect(tarea).toMatchObject({ estado: "FALLIDO", error: "No se pudo descargar el archivo. Vuelve a leerlo en unos minutos." });
  });

  it("explica que un PDF sin texto parece escaneado", async () => {
    carga!.archivoRuta = "snii/2025/20261109T100000-resultados.pdf";
    archivo = crearPdfDePrueba([[]]);
    await procesarCarga(7, almacen);
    expect(tarea.error).toBe("El PDF no tiene texto seleccionable (parece escaneado); súbelo en Excel.");
    expect(carga?.estado).toBe("FALLIDA");
  });

  it("explica qué columnas faltan", async () => {
    const libro = new ExcelJS.Workbook();
    libro.addWorksheet("Hoja").addRows([["CVU", "NOMBRES"], ["900001", "ANA"]]);
    archivo = new Uint8Array(await libro.xlsx.writeBuffer());
    await procesarCarga(7, almacen);
    expect(tarea.error).toBe("No se encontraron las columnas de nombre y nivel otorgado en el archivo.");
  });

  it("no muestra a la persona un error técnico inesperado", async () => {
    dobles.prisma.renglonResultado.createMany.mockRejectedValue(new Error("connection terminated unexpectedly"));
    await procesarCarga(7, almacen);
    expect(tarea.error).toBe("No se pudo leer el archivo. Vuelve a intentarlo o súbelo en Excel.");
    expect(carga?.estado).toBe("FALLIDA");
  });

  it("termina sin error si la carga ya no existe", async () => {
    carga = null;
    await expect(procesarCarga(7, almacen)).resolves.toBeUndefined();
    expect(tarea).toMatchObject({ estado: "FALLIDO", error: "Esa carga ya no existe." });
    expect(dobles.prisma.renglonResultado.createMany).not.toHaveBeenCalled();
  });

  it("no lanza si la tarea no tiene una carga válida", async () => {
    tarea.datos = { otra: "cosa" };
    await expect(procesarCarga(7, almacen)).resolves.toBeUndefined();
    expect(tarea.estado).toBe("FALLIDO");
  });
});
