import Link from "next/link";
import { Marco } from "@/components/marco";
import { Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const numero = new Intl.NumberFormat("es-MX");

export default async function AdministracionPage() {
  const perfil = await requireModulo("administracion");

  // Solo cifras que ya existen en la base; el resto del panel llega en las fases siguientes.
  const [activos, desactivados, administradores, sinPerfil] = await Promise.all([
    prisma.perfil.count({ where: { activo: true } }),
    prisma.perfil.count({ where: { activo: false } }),
    prisma.perfil.count({ where: { activo: true, rol: "ADMINISTRADOR" } }),
    prisma.profesor.count({ where: { estatusLaboral: "ACTIVO", perfil: { is: null } } }),
  ]);

  const tarjetas = [
    { texto: "Usuarios con acceso", cifra: activos, nota: `${numero.format(administradores)} administradores` },
    { texto: "Accesos desactivados", cifra: desactivados, nota: "Se pueden reactivar" },
    { texto: "Profesores sin perfil", cifra: sinPerfil, nota: "Activos que aún no tienen acceso" },
  ];

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="administracion" titulo="Administración"
      subtitulo="Usuarios y roles del sistema.">
      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-3">
        {tarjetas.map((t) => (
          <Link key={t.texto} href="/administracion/usuarios" className="flex flex-col gap-1 rounded-2xl bg-marca-tenue p-4 hover:bg-marca-suave">
            <span className="text-xs text-texto-3">{t.texto}</span>
            <strong className="text-2xl font-semibold tracking-tight text-texto">{numero.format(t.cifra)}</strong>
            <span className="text-xs text-texto-2">{t.nota}</span>
          </Link>
        ))}
      </section>

      <Panel titulo="Gestión" descripcion="Auditoría, calidad de datos y control del escaneo llegarán en las siguientes fases.">
        <Link href="/administracion/usuarios" className="text-sm font-medium text-marca hover:underline">
          Usuarios y roles
        </Link>
      </Panel>
    </Marco>
  );
}
