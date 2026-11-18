import { Marco } from "@/components/marco";
import { Avatar, Panel } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { requireRol } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { accesosFrecuentes, modulosDelRol, LIMITE_ACCESOS } from "@/modules/cuenta/accesos";
import { resumenPerfil } from "@/modules/cuenta/perfil";
import { AccesosFrecuentes } from "./accesos-frecuentes";
import { Apariencia } from "./apariencia";
import { FormularioContrasena } from "./formulario-contrasena";

export default async function MiCuentaPage() {
  // RNF-005: cualquier persona con sesión ve su propia cuenta.
  const sesion = await requireRol([...ROLES]);
  const perfil = await prisma.perfil.findUniqueOrThrow({
    where: { id: sesion.id },
    select: {
      correo: true,
      rol: true,
      creadoEn: true,
      profesor: { select: { nombres: true, apellidos: true, departamento: { select: { nombre: true } } } },
    },
  });
  const resumen = resumenPerfil(perfil);
  const filas = await prisma.accesoModulo.findMany({
    where: { perfilId: sesion.id },
    select: { modulo: true, conteo: true, ultimoAcceso: true },
  });
  const accesos = accesosFrecuentes(filas, perfil.rol);
  const sugeridos = modulosDelRol(perfil.rol)
    .slice(0, LIMITE_ACCESOS)
    .map((m) => ({ slug: m.slug, nombre: m.nombre, descripcion: m.descripcion, href: `/${m.slug}` }));

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="cuenta" titulo="Mi cuenta"
      subtitulo="Tus datos, la apariencia y la seguridad de tu sesión.">
      <section className="grid gap-4 xl:grid-cols-3">
        <Panel titulo="Perfil" descripcion="Así te identifica la plataforma" className="xl:col-span-2">
          <div className="flex items-start gap-4">
            <Avatar nombre={resumen.profesor?.nombre ?? resumen.correo} />
            <dl className="grid min-w-0 flex-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Dato nombre="Correo" valor={resumen.correo} />
              <Dato nombre="Rol" valor={resumen.rol} />
              <Dato nombre="Miembro desde" valor={resumen.alta} />
              <Dato nombre="Profesor vinculado" valor={resumen.profesor?.nombre ?? "Sin vincular"} />
              {resumen.profesor && <Dato nombre="Departamento" valor={resumen.profesor.departamento ?? "Sin departamento"} />}
            </dl>
          </div>
        </Panel>
        <Panel titulo="Apariencia" descripcion="Elige cómo se ve la plataforma">
          <Apariencia />
        </Panel>
      </section>

      <Panel titulo="Accesos frecuentes" descripcion="Los módulos que más usas, para entrar en un clic">
        <AccesosFrecuentes accesos={accesos} sugeridos={sugeridos} />
      </Panel>

      <Panel titulo="Seguridad" descripcion="Cambia la contraseña con la que entras a la plataforma">
        <FormularioContrasena />
      </Panel>
    </Marco>
  );
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-texto-3">{nombre}</dt>
      <dd className="truncate font-medium">{valor}</dd>
    </div>
  );
}
