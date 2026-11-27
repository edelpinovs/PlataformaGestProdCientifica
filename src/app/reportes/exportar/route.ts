import { NextResponse } from "next/server";
import { requireModulo } from "@/lib/auth/session";
import type { ParametrosListado } from "@/lib/listados/consulta";
import { cargarCompleto } from "@/modules/reportes/cargar-completo";
import { cargarResultados } from "@/modules/reportes/cargar-publicaciones";
import { cargarConvocatoria } from "@/modules/reportes/cargar-convocatoria";
import { cargarMatriz } from "@/modules/reportes/cargar-matriz";
import { cargarDepartamentos, cargarVigencias } from "@/modules/reportes/cargar-vigencias";
import { analizarCompleto } from "@/modules/reportes/completo";
import { analizarConvocatoria } from "@/modules/reportes/convocatoria";
import {
  generarExcel,
  generarPdf,
  leerExportacion,
  nombreArchivo,
  tablaCompleto,
  tablaConvocatoria,
  tablaMatriz,
  tablaResultados,
  tablaVigencias,
  type ReporteExportable,
  type TablaExportable,
} from "@/modules/reportes/exportar";
import { analizarMatriz } from "@/modules/reportes/matriz";
import { analizarResultados, filaResultados } from "@/modules/reportes/publicaciones";
import { analizarReporte, tiposPedidos } from "@/modules/reportes/vigencias";

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

async function armar(reporte: ReporteExportable, parametros: ParametrosListado): Promise<TablaExportable> {
  if (reporte === "vigencias") {
    const [departamentos, filas] = await Promise.all([
      cargarDepartamentos(),
      cargarVigencias(tiposPedidos(parametros)),
    ]);
    const estado = analizarReporte(parametros, { departamentos: departamentos.map((fila) => fila.id) });
    return tablaVigencias(filas, estado);
  }
  if (reporte === "convocatoria") {
    const [departamentos, carga] = await Promise.all([
      cargarDepartamentos(),
      cargarConvocatoria(),
    ]);
    const estado = analizarConvocatoria(parametros, { departamentos: departamentos.map((fila) => fila.id) });
    return tablaConvocatoria(carga.dictamenes, carga.participaciones, carga.historialSnii, estado);
  }
  if (reporte === "publicaciones") {
    const carga = await cargarResultados();
    const estado = analizarResultados(parametros, carga.catalogo);
    return tablaResultados(carga.profesores.map((profesor) => filaResultados(profesor, estado)), estado);
  }
  if (reporte === "completo") {
    const carga = await cargarCompleto();
    const estado = analizarCompleto(parametros, {
      departamentos: carga.departamentos.map((fila) => fila.id),
      programas: carga.programas.map((fila) => fila.id),
    });
    return tablaCompleto(carga.filas, estado);
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
