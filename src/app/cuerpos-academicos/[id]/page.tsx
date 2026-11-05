import { notFound } from "next/navigation";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ETIQUETA_NIVEL } from "@/modules/cuerpos-academicos/cuerpo";
import { nombreProfesor, notaSiDejaDeSerLider, tieneProdepActivo } from "@/modules/cuerpos-academicos/integrantes";
import { FilaIntegrante } from "./fila";
import { FilaLgac } from "./fila-lgac";
import { FormularioIntegrante, FormularioLider } from "./formulario";
import { FormularioLgac } from "./formulario-lgac";

export default async function DetalleCuerpoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    editado?: string;
    eliminado?: string;
    lider?: string;
    lgac?: string;
    lgacEliminada?: string;
  }>;
}) {
  const perfil = await requireModulo("cuerpos-academicos");
  const { id: bruto } = await params;
  const id = Number(bruto);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const hoy = new Date();
  const [{ editado, eliminado, lider, lgac: lgacEditada, lgacEliminada }, cuerpo, profesoresTc] = await Promise.all([
    searchParams,
    prisma.cuerpoAcademico.findUnique({
      where: { id },
      include: {
        departamento: { select: { nombre: true, nomenclatura: true } },
        integrantes: {
          include: {
            profesor: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                codigo: true,
                reconocimientosProdep: { select: { resultado: true, inicio: true, fin: true } },
              },
            },
          },
          orderBy: { profesor: { apellidos: "asc" } },
        },
        lgacs: {
          include: {
            profesores: { select: { id: true, nombres: true, apellidos: true, codigo: true } },
          },
          orderBy: { nombre: "asc" },
        },
      },
    }),
    prisma.profesor.findMany({
      where: { tipoContratacion: "TIEMPO_COMPLETO", estatusLaboral: "ACTIVO" },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        codigo: true,
        reconocimientosProdep: { select: { resultado: true, inicio: true, fin: true } },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
  ]);
  if (!cuerpo) notFound();

  const idsIntegrantes = new Set(cuerpo.integrantes.map((i) => i.profesorId));
  const candidatos = profesoresTc
    .filter((p) => !idsIntegrantes.has(p.id))
    .map((p) => ({
      id: p.id,
      etiqueta: nombreProfesor(p),
      prodepActivo: tieneProdepActivo(p.reconocimientosProdep, hoy),
    }));
  const integrantes = cuerpo.integrantes.map((i) => ({
    profesorId: i.profesorId,
    nombre: nombreProfesor(i.profesor),
    codigo: i.profesor.codigo,
    prodepActivo: tieneProdepActivo(i.profesor.reconocimientosProdep, hoy),
  }));

  const avisoLider = notaSiDejaDeSerLider(lider === "1");
  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de ${editado}.${avisoLider}`
    : typeof eliminado === "string" ? `Se quitó a ${eliminado}.${avisoLider}`
    : null;
  const resultadoLgac =
    typeof lgacEditada === "string" ? `Se guardaron los cambios de «${lgacEditada}».`
    : typeof lgacEliminada === "string" ? `Se eliminó «${lgacEliminada}».`
    : null;
  const paraLgac = integrantes.map((i) => ({ profesorId: i.profesorId, nombre: i.nombre }));
  const lineas = cuerpo.lgacs.map((l) => ({
    id: l.id,
    nombre: l.nombre,
    descripcion: l.descripcion,
    profesores: l.profesores.map((p) => ({ profesorId: p.id, nombre: nombreProfesor(p) })),
  }));

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="cuerpos-academicos"
      titulo={cuerpo.nombre}
      subtitulo={`${cuerpo.clave} · ${ETIQUETA_NIVEL[cuerpo.nivel]} · ${cuerpo.departamento.nombre}`}
      volver={{ href: "/cuerpos-academicos", texto: "Cuerpos académicos" }}>
      <Panel titulo="Asignar integrante" descripcion="RF-013 · CU-008. Solo profesores de tiempo completo con estatus laboral activo. El primero debe tener PRODEP vigente; después no se quita el último PRODEP que aún esté vigente.">
        {profesoresTc.length === 0 ? (
          <EstadoVacio>
            Aún no hay profesores de tiempo completo en el directorio. Cuando el módulo de Profesores esté en marcha, aparecerán aquí.
          </EstadoVacio>
        ) : candidatos.length === 0 ? (
          <EstadoVacio>Todos los profesores de tiempo completo ya son integrantes de este cuerpo académico.</EstadoVacio>
        ) : (
          <FormularioIntegrante
            cuerpoId={cuerpo.id}
            candidatos={candidatos}
            avisoInicial={
              integrantes.length === 0 && !candidatos.some((c) => c.prodepActivo)
                ? "Nadie en el directorio tiene Perfil Deseable PRODEP vigente. El primer integrante no se podrá guardar hasta que exista uno."
                : undefined
            }
          />
        )}
      </Panel>

      <Panel titulo={`Integrantes (${integrantes.length})`}>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        {integrantes.length === 0 ? (
          <EstadoVacio>Aún no hay integrantes. El primero debe tener Perfil Deseable PRODEP activo.</EstadoVacio>
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <th className={claseTabla.celdaEncabezado}>Profesor</th>
                  <th className={claseTabla.celdaEncabezado}>Código</th>
                  <th className={claseTabla.celdaEncabezado}>PRODEP</th>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {integrantes.map((i) => (
                  <FilaIntegrante
                    key={`${i.profesorId}-${i.nombre}`}
                    cuerpoId={cuerpo.id}
                    integrante={i}
                    esLider={cuerpo.liderId === i.profesorId}
                    candidatos={candidatos}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel titulo="Líder del cuerpo académico" descripcion="RF-014 · CU-008. Un único líder, que debe ser integrante.">
        {integrantes.length === 0 ? (
          <EstadoVacio>Primero asigna integrantes. El líder se elige entre quienes ya forman parte del cuerpo académico.</EstadoVacio>
        ) : (
          <div className="flex flex-col gap-4">
            {!cuerpo.liderId && (
              <Aviso tipo="aviso">Este cuerpo académico aún no tiene líder.</Aviso>
            )}
            <FormularioLider
              cuerpoId={cuerpo.id}
              integrantes={integrantes.map((i) => ({ profesorId: i.profesorId, nombre: i.nombre }))}
              liderId={cuerpo.liderId}
            />
          </div>
        )}
      </Panel>

      <Panel titulo="Registrar LGAC" descripcion="RF-015 · CU-009. Cada línea pertenece a este cuerpo académico y se vincula a sus integrantes.">
        {integrantes.length === 0 ? (
          <EstadoVacio>Primero asigna integrantes. Una LGAC se vincula a quienes ya forman parte del cuerpo académico.</EstadoVacio>
        ) : (
          <FormularioLgac cuerpoId={cuerpo.id} integrantes={paraLgac} />
        )}
      </Panel>

      <Panel titulo={`LGAC (${lineas.length})`}>
        {resultadoLgac && <div className="mb-4"><Aviso tipo="exito">{resultadoLgac}</Aviso></div>}
        {lineas.length === 0 ? (
          <EstadoVacio>Aún no hay líneas registradas en este cuerpo académico.</EstadoVacio>
        ) : (
          <table className={claseTabla.tabla}>
            <thead className={claseTabla.encabezado}>
              <tr>
                <th className={claseTabla.celdaEncabezado}>Nombre</th>
                <th className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Descripción</th>
                <th className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Integrantes</th>
                <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => (
                <FilaLgac
                  key={`${l.id}-${l.nombre}-${l.descripcion ?? ""}-${l.profesores.map((p) => p.profesorId).join(",")}`}
                  cuerpoId={cuerpo.id}
                  lgac={l}
                  integrantes={paraLgac}
                />
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </Marco>
  );
}
