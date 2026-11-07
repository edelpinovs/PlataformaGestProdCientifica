import { notFound } from "next/navigation";
import { Marco } from "@/components/marco";
import { Aviso } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { demoHabilitada } from "@/modules/produccion/demostracion";
import { SimuladorEscaneo } from "./simulador";

export default async function DemostracionPage() {
  const perfil = await requireModulo("produccion");
  if (!demoHabilitada(process.env.NODE_ENV, process.env.PRODUCCION_DEMO)) notFound();
  return <Marco correo={perfil.correo} rol={perfil.rol} activo="produccion" titulo="Demostración del escaneo"
    subtitulo="Historial, duplicados y coautorías con datos ficticios."
    volver={{ href: "/produccion/escaneo", texto: "Volver al escaneo" }}>
    <Aviso tipo="aviso">SIMULACIÓN: fuentes y persistencia en memoria. No consulta APIs externas ni modifica la base de datos. Los estados de autoría se simulan; no se ejecuta el módulo de Validación.</Aviso>
    <SimuladorEscaneo />
  </Marco>;
}
