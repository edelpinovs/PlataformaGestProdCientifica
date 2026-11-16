import { NextResponse } from "next/server";

// RF-020 (#170): ruta retirada; no crea ni continúa trabajos con el secreto antiguo.
export async function GET() {
  return NextResponse.json({ error: "El escaneo programado está desactivado. Coordinación puede iniciarlo manualmente desde Producción." }, { status: 410 });
}