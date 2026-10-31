import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ejecutarEscaneo } from "@/modules/produccion/escaneo";

// Escaneo incremental diario (RF-020), lanzado por Vercel Cron (ver vercel.json).
// Vercel envía "Authorization: Bearer <CRON_SECRET>"; cualquier otra llamada se rechaza.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const job = await prisma.job.create({
    data: {
      tipo: "escaneo-diario",
      estado: "PENDIENTE",
    },
  });

  const anioActual = new Date().getFullYear();
  const resumen = await ejecutarEscaneo({ jobId: job.id, anio: anioActual });

  return NextResponse.json({ ok: true, resumen, jobId: job.id });
}

