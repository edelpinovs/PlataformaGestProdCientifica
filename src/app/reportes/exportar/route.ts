import { NextResponse } from "next/server";
import { requireModulo } from "@/lib/auth/session";
import type { ParametrosListado } from "@/lib/listados/consulta";
import { cargarConvocatoria } from "@/modules/reportes/cargar-convocatoria";
import { cargarMatriz } from "@/modules/reportes/cargar-matriz";
import { cargarVigencias } from "@/modules/reportes/cargar-vigencias";
import { analizarConvocatoria } from "@/modules/reportes/convocatoria";
import {
  generarExcel,
  generarPdf,
  leerExportacion,
  nombreArchivo,
  tablaConvocatoria,
  tablaMatriz,
  tablaVigencias,
  type TablaExportable,
} from "@/modules/reportes/exportar";
import { analizarMatriz } from "@/modules/reportes/matriz";
import { analizarReporte } from "@/modules/reportes/vigencias";

function parametrosDe(url: URL): ParametrosListado {
  const parametros: ParametrosListado = {};
  for (const clave of new Set(url.searchParams.keys())) {
    const valores = url.searchParams.getAll(clave);
    parametros[clave] = valores.length > 1 ? valores : valores[0];
  }
  return parametros;
}

function texto(mensaje: string, estado: number) {
  return new NextResponse(mensaje, { status: estado, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

async function armar(reporte: "vigencias" | "convocatoria" | "matriz", parametros: ParametrosListado): Promise<TablaExportable> {
  if (reporte === "vigencias") {
    const estado = analizarReporte(parametros);
    return tablaVigencias(await cargarVigencias(estado.tipos), estado);
  }
  if (reporte === "convocatoria") {
    const estado = analizarConvocatoria(parametros);
    const carga = await cargarConvocatoria();
    return tablaConvocatoria(carga.dictamenes, carga.participaciones, carga.historialSnii, estado);
  }
  const carga = await cargarMatriz();
  const estado = analizarMatriz(parametros, {
    departamentos: carga.departamentos.map((fila) => fila.id),
    programas: carga.programas.map((fila) => fila.id),
  });
  return tablaMatriz(carga.filas, estado);
}

export async function GET(solicitud: Request) {
  await requireModulo("reportes");
  const parametros = parametrosDe(new URL(solicitud.url));
  const pedido = leerExportacion(parametros);
  if ("error" in pedido) return texto(pedido.error, 400);

  const tabla = await armar(pedido.reporte, parametros);
  if (tabla.columnas.length === 0) return texto("Elige al menos una columna para exportar el reporte.", 400);

  const archivo = pedido.formato === "xlsx" ? await generarExcel(tabla) : generarPdf(tabla);
  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": pedido.formato === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo(pedido.reporte, pedido.formato)}"`,
      "Cache-Control": "no-store",
    },
  });
}
