import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ejecutarEscaneo } from "@/modules/produccion/escaneo";
import { repositorioPrisma } from "@/app/produccion/repositorio";

// Escaneo incremental diario (RF-020), lanzado por Vercel Cron (ver vercel.json).
// Vercel envía "Authorization: Bearer <CRON_SECRET>"; cualquier otra llamada se rechaza.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let jobId: number | undefined;

  try {
    const job = await prisma.job.create({
      data: {
        tipo: "escaneo-diario",
        estado: "PENDIENTE",
      },
    });
    jobId = job.id;

    // Escaneo incremental diario por lotes (RF-020, Hallazgos 2a y 3c).
    // No se fuerza un año fijo para que el motor consulte CorteEscaneo por profesor y fuente.
    // Se limita a un lote de hasta 25 profesores por ejecución para respetar el timeout de Vercel.
    const resumen = await ejecutarEscaneo(
      {
        jobId: job.id,
        limiteProfesores: 25,
      },
      repositorioPrisma,
    );

    return NextResponse.json({ ok: true, resumen, jobId: job.id });
  } catch (err: unknown) {
    if (jobId) {
      await prisma.job
        .update({
          where: { id: jobId },
          data: {
            estado: "FALLIDO",
            error: err instanceof Error ? err.message : "Error durante la ejecución del cron",
          },
        })
        .catch(() => {});
    }
    return NextResponse.json(
      { ok: false, error: "Error durante la ejecución del cron" },
      { status: 500 },
    );
  }
}

