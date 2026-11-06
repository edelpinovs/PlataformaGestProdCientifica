import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearTrabajoEscaneo, obtenerTrabajoPendiente, procesarSiguienteProfesor } from "@/app/produccion/trabajos";

export const maxDuration = 300;

// Vercel Cron y la pantalla comparten la cola persistida y la reserva por Job.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const trabajo = await obtenerTrabajoPendiente() ?? await crearTrabajoEscaneo("escaneo-diario");
    after(async () => {
      const inicio = Date.now();
      // Cada profesor deja un punto de recuperación. El siguiente cron retoma
      // desde ese índice, aunque el navegador se cierre o el proceso expire.
      for (let procesados = 0; procesados < 25 && Date.now() - inicio < 180_000; procesados++) {
        await procesarSiguienteProfesor(trabajo.id);
        const actual = await prisma.job.findUnique({ where: { id: trabajo.id } });
        if (!actual || actual.estado !== "PENDIENTE") break;
      }
    });
    return NextResponse.json({ ok: true, jobId: trabajo.id, estado: trabajo.estado }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo iniciar el escaneo programado." }, { status: 500 });
  }
}
