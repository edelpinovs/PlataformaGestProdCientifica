import { NextResponse } from "next/server";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, type ParametrosListado } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { eventoAuditoria } from "@/modules/administracion/auditoria";
import { filtroAuditoria, LISTADO_AUDITORIA, ordenAuditoria } from "@/modules/administracion/auditoria-listado";
import { filtrarHallazgos, LISTADO_CALIDAD, ordenarHallazgos } from "@/modules/administracion/calidad";
import {
  descripcionFiltros,
  leerPedido,
  motivoDemasiadasFilas,
  nombreArchivo,
  resumenExportacion,
  tablaAuditoria,
  tablaCalidad,
  tablaUsuarios,
  TIPOS_CONTENIDO,
  type Formato,
  type ListadoExportable,
} from "@/modules/administracion/exportar";
import { filtroUsuarios, LISTADO_USUARIOS, ordenUsuarios } from "@/modules/administracion/usuarios-listado";
import { generarExcel, generarPdf, type TablaExportable } from "@/modules/reportes/exportar";
import { cargarHallazgos } from "../calidad/cargar";

// Descarga en Excel o PDF de un listado del panel (issue 244): todas las filas que coinciden con la
// búsqueda y los filtros, no solo la página visible. Solo ADMINISTRADOR. Cada descarga queda en la
// bitácora, porque saca datos del sistema; por eso, si no se puede registrar, no se entrega el archivo.
//
// Es un GET a propósito: los botones son enlaces y el archivo llega como descarga. Como escribe en la
// bitácora, se rechaza lo que el navegador marca como pedido desde otro sitio (`Sec-Fetch-Site: cross-site`).

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

type Armado = { tabla: TablaExportable; filtros: string } | { error: string };

async function armar(listado: ListadoExportable, parametros: ParametrosListado, formato: Formato): Promise<Armado> {
  if (listado === "usuarios") {
    const { consulta, errores } = analizarListado(LISTADO_USUARIOS, parametros);
    if (Object.keys(errores).length) return { error: `No se pudo exportar: ${Object.values(errores).join(" ")}` };
    const where = filtroUsuarios(consulta);
    const demasiadas = motivoDemasiadasFilas(await prisma.perfil.count({ where }), formato);
    if (demasiadas) return { error: demasiadas };
    const filas = await prisma.perfil.findMany({
      where,
      orderBy: ordenUsuarios(consulta),
      select: { correo: true, rol: true, activo: true, creadoEn: true, profesor: { select: { codigo: true, nombres: true, apellidos: true } } },
    });
    return { tabla: tablaUsuarios(filas), filtros: descripcionFiltros(listado, consulta) };
  }

  if (listado === "auditoria") {
    const { consulta, errores } = analizarListado(LISTADO_AUDITORIA, parametros);
    if (Object.keys(errores).length) return { error: `No se pudo exportar: ${Object.values(errores).join(" ")}` };
    const where = filtroAuditoria(consulta);
    const demasiadas = motivoDemasiadasFilas(await prisma.auditoria.count({ where }), formato);
    if (demasiadas) return { error: demasiadas };
    const filas = await prisma.auditoria.findMany({
      where,
      orderBy: ordenAuditoria(consulta),
      select: { creadoEn: true, actorCorreo: true, modulo: true, accion: true, resumen: true },
    });
    return { tabla: tablaAuditoria(filas), filtros: descripcionFiltros(listado, consulta) };
  }

  const { consulta, errores } = analizarListado(LISTADO_CALIDAD, parametros);
  if (Object.keys(errores).length) return { error: `No se pudo exportar: ${Object.values(errores).join(" ")}` };
  const hallazgos = ordenarHallazgos(filtrarHallazgos(await cargarHallazgos(), consulta), consulta);
  const demasiadas = motivoDemasiadasFilas(hallazgos.length, formato);
  if (demasiadas) return { error: demasiadas };
  return { tabla: tablaCalidad(hallazgos), filtros: descripcionFiltros(listado, consulta) };
}

export async function GET(solicitud: Request) {
  const actor = await requireModulo("administracion");

  if (solicitud.headers.get("sec-fetch-site") === "cross-site") {
    return texto("La descarga solo se puede pedir desde el panel de administración.", 403);
  }

  const parametros = parametrosDe(new URL(solicitud.url));
  const pedido = leerPedido(parametros);
  if ("error" in pedido) return texto(pedido.error, 400);

  const armado = await armar(pedido.listado, parametros, pedido.formato);
  if ("error" in armado) return texto(armado.error, 400);

  const archivo = pedido.formato === "xlsx" ? await generarExcel(armado.tabla) : generarPdf(armado.tabla);

  try {
    await prisma.auditoria.create({
      data: eventoAuditoria(
        "listado.exportado",
        actor,
        { tipo: "Listado", id: pedido.listado },
        resumenExportacion(pedido.listado, pedido.formato, armado.tabla.filas.length, armado.filtros),
      ),
    });
  } catch {
    // Sin constancia en la bitácora no se entrega el archivo; el mensaje no repite el error de la base.
    return texto("No se pudo registrar la descarga en la bitácora. Inténtalo de nuevo.", 500);
  }

  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": TIPOS_CONTENIDO[pedido.formato],
      "Content-Disposition": `attachment; filename="${nombreArchivo(pedido.listado, pedido.formato)}"`,
      "Cache-Control": "no-store",
    },
  });
}
