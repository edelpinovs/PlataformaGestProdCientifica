import { NextResponse } from "next/server";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, type ParametrosListado } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { NOMBRE_ARCHIVO_PROFESORES, TIPO_EXCEL, tablaProfesores } from "@/modules/profesores/exportar";
import { filtroProfesores, listadoProfesores, ordenProfesores } from "@/modules/profesores/profesores-listado";
import { generarExcel } from "@/modules/reportes/exportar";

// Descarga en Excel de los profesores que coinciden con la búsqueda y los filtros del listado
// (issue #233). Mismos roles que el módulo; la ruta es un GET, así que no cambia nada en la base.

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

export async function GET(solicitud: Request) {
  await requireModulo("profesores");

  const [departamentos, grados] = await Promise.all([
    prisma.departamento.findMany({ select: { id: true } }),
    prisma.gradoCientifico.findMany({ select: { id: true } }),
  ]);
  const definicion = listadoProfesores(departamentos.map((d) => d.id), grados.map((g) => g.id));
  const { consulta, errores } = analizarListado(definicion, parametrosDe(new URL(solicitud.url)));
  const mensajes = Object.values(errores);
  if (mensajes.length > 0) return texto(`No se pudo exportar: ${mensajes.join(" ")}`, 400);

  const profesores = await prisma.profesor.findMany({
    where: filtroProfesores(consulta),
    orderBy: ordenProfesores(consulta),
    select: {
      codigo: true, apellidos: true, nombres: true, correo: true, tipoContratacion: true, estatusLaboral: true,
      grado: { select: { nombre: true } },
      departamento: { select: { nombre: true } },
    },
  });

  const archivo = await generarExcel(tablaProfesores(profesores));
  return new NextResponse(new Uint8Array(archivo), {
    headers: {
      "Content-Type": TIPO_EXCEL,
      "Content-Disposition": `attachment; filename="${NOMBRE_ARCHIVO_PROFESORES}"`,
      "Cache-Control": "no-store",
    },
  });
}
