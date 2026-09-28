import { NextResponse } from "next/server";

// Escaneo incremental diario (RF-020), lanzado por Vercel Cron (ver vercel.json).
// Vercel envía "Authorization: Bearer <CRON_SECRET>"; cualquier otra llamada se rechaza.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // TODO(Integrante 6): crear un Job de tipo "escaneo" y procesar el primer lote.
  return NextResponse.json({ ok: true, pendiente: "Motor de escaneo en desarrollo" });
}
