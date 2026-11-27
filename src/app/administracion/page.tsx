import Link from "next/link";
import { Marco } from "@/components/marco";
import { EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ACCIONES_AUDITORIA, type AccionAuditoria } from "@/modules/administracion/auditoria";
import { ZONA_ADMINISTRACION } from "@/modules/administracion/fechas";
import { aniosCuerpoPorVencer, rangoPorVencer, requiereAtencion, RESULTADOS_EN_SEMAFORO } from "@/modules/administracion/inicio";
import { MESES_AVISO } from "@/modules/reportes/semaforo";
import { inicioDelDiaUtc } from "@/modules/reportes/vigencias";

const numero = new Intl.NumberFormat("es-MX");
const fechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: ZONA_ADMINISTRACION });

export default async function AdministracionPage() {
  const perfil = await requireModulo("administracion");

  // Todas las cifras se cuentan en la base (issue 276): ninguna tabla se carga completa en memoria.
  // «Por vencer» usa el mismo día y el mismo rango que el semáforo de Reportes.
  const porVencer = rangoPorVencer(inicioDelDiaUtc(new Date()));
  const vigencia = { resultado: { in: RESULTADOS_EN_SEMAFORO }, fin: { gte: porVencer.desde, lte: porVencer.hasta } };
  const [
    profesoresActivos, profesores, cuerpos, cuerposSinLider, sniiPorVencer, prodepPorVencer, cuerposPorVencer,
    pendientesValidar, usuariosActivos, desactivados, administradores, sinPerfil, actividad,
  ] = await Promise.all([
    prisma.profesor.count({ where: { estatusLaboral: "ACTIVO" } }),
    prisma.profesor.count(),
    prisma.cuerpoAcademico.count(),
    prisma.cuerpoAcademico.count({ where: { liderId: null } }),
    prisma.reconocimientoSnii.count({ where: vigencia }),
    prisma.reconocimientoProdep.count({ where: vigencia }),
    prisma.cuerpoAcademico.count({ where: { anioVencimiento: { in: aniosCuerpoPorVencer(porVencer) } } }),
    prisma.autoria.count({ where: { estado: "PENDIENTE" } }),
    prisma.perfil.count({ where: { activo: true } }),
    prisma.perfil.count({ where: { activo: false } }),
    prisma.perfil.count({ where: { activo: true, rol: "ADMINISTRADOR" } }),
    prisma.profesor.count({ where: { estatusLaboral: "ACTIVO", perfil: { is: null } } }),
    prisma.auditoria.findMany({
      orderBy: [{ creadoEn: "desc" }, { id: "desc" }], take: 5,
      select: { id: true, creadoEn: true, actorCorreo: true, accion: true, resumen: true },
    }),
  ]);
  const vigenciasPorVencer = sniiPorVencer + prodepPorVencer + cuerposPorVencer;
  const atencion = requiereAtencion({ sinPerfil, cuerposSinLider, porVencer: vigenciasPorVencer, pendientesValidar });

  const tarjetas = [
    { texto: "Profesores activos", cifra: profesoresActivos, nota: `De ${numero.format(profesores)} en el directorio`, href: "/profesores?situacion=activos" },
    { texto: "Cuerpos académicos", cifra: cuerpos, nota: cuerposSinLider ? `${numero.format(cuerposSinLider)} sin líder` : "Todos tienen líder", href: "/cuerpos-academicos" },
    { texto: "Vigencias por vencer", cifra: vigenciasPorVencer, nota: `SNII, PRODEP y CA en ${MESES_AVISO} meses`, href: "/reportes?semaforo=AMARILLO" },
    { texto: "Pendientes de validación", cifra: pendientesValidar, nota: "Publicaciones por revisar", href: "/validacion" },
    { texto: "Usuarios con acceso", cifra: usuariosActivos, nota: `${numero.format(administradores)} administradores · ${numero.format(desactivados)} desactivados`, href: "/administracion/usuarios" },
  ];

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="administracion" titulo="Administración"
      subtitulo="Estado general del sistema, usuarios y roles.">
      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tarjetas.map((t) => (
          <Link key={t.texto} href={t.href} className="flex flex-col gap-1 rounded-2xl bg-marca-tenue p-4 hover:bg-marca-suave">
            <span className="text-xs text-texto-3">{t.texto}</span>
            <strong className="text-2xl font-semibold tracking-tight text-texto">{numero.format(t.cifra)}</strong>
            <span className="text-xs text-texto-2">{t.nota}</span>
          </Link>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel titulo="Requiere atención" descripcion="Cada punto lleva a la pantalla donde se corrige.">
          {atencion.length === 0 ? (
            <EstadoVacio>No hay nada pendiente por ahora.</EstadoVacio>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {atencion.map((p) => (
                <li key={p.clave}>
                  <Link href={p.enlace} className="font-medium text-marca hover:underline">{p.texto}</Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titulo="Actividad reciente" descripcion="Últimos cambios registrados en la bitácora."
          accion={{ href: "/administracion/auditoria", texto: "Ver bitácora" }}>
          {actividad.length === 0 ? (
            <EstadoVacio>Aún no hay actividad registrada.</EstadoVacio>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {actividad.map((a) => (
                <li key={a.id} className="flex flex-col gap-0.5">
                  <span className="text-texto">{ACCIONES_AUDITORIA[a.accion as AccionAuditoria]?.texto ?? a.accion}</span>
                  <span className="text-xs text-texto-3">
                    {fechaHora.format(a.creadoEn)} · <span className="break-all">{a.actorCorreo}</span>
                  </span>
                  <span className="text-xs text-texto-2">{a.resumen}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel titulo="Reportes" descripcion="Se descargan en Excel o PDF desde cada reporte. Los listados de este panel también se descargan desde su pantalla.">
        <ul className="grid gap-3 text-sm sm:grid-cols-2">
          {[
            { href: "/reportes", texto: "Vigencias y estatus" },
            { href: "/reportes/matriz", texto: "Matriz de acreditación" },
            { href: "/reportes/convocatoria", texto: "Convocatoria anual" },
            { href: "/reportes/completo", texto: "Reporte completo" },
          ].map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="font-medium text-marca hover:underline">{e.texto}</Link>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel titulo="Gestión">
        <ul className="flex flex-col gap-3 text-sm">
          {[
            { href: "/administracion/usuarios", texto: "Usuarios y roles", nota: "Quién entra al sistema y qué puede hacer." },
            { href: "/administracion/auditoria", texto: "Auditoría", nota: "Quién hizo qué y cuándo." },
            { href: "/administracion/calidad", texto: "Calidad de datos", nota: "Inconsistencias que conviene corregir." },
            { href: "/administracion/escaneo", texto: "Control del escaneo", nota: "Estado de las búsquedas de publicaciones." },
            { href: "/administracion/sistema", texto: "Estado del sistema", nota: "Qué está funcionando y qué falta configurar." },
          ].map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="font-medium text-marca hover:underline">{e.texto}</Link>
              <span className="block text-xs text-texto-3">{e.nota}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </Marco>
  );
}
