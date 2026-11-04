import { Marco } from "@/components/marco";
import { Aviso, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FilaSnii } from "./fila";
import { FormularioSnii } from "./formulario";

export default async function SniiPage({ searchParams }: PageProps<"/reconocimientos/snii">) {
  const perfil = await requireModulo("reconocimientos");
  const [profesores, reconocimientos, parametros] = await Promise.all([
    prisma.profesor.findMany({
      select: { id: true, codigo: true, nombres: true, apellidos: true, cvu: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    prisma.reconocimientoSnii.findMany({
      include: { profesor: { select: { id: true, codigo: true, nombres: true, apellidos: true, cvu: true } } },
      orderBy: [{ fin: "desc" }, { id: "desc" }],
    }),
    searchParams,
  ]);
  const mensaje = parametros.editado === "1" ? "Se actualizaron los datos del reconocimiento SNII."
    : parametros.eliminado === "1" ? "Se eliminó el reconocimiento SNII."
    : null;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="reconocimientos" titulo="Reconocimiento SNII"
      volver={{ href: "/reconocimientos", texto: "Reconocimientos" }}>
      {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
      <Panel titulo="Registrar reconocimiento">
        {profesores.length === 0 ? <EstadoVacio>Registra primero un profesor para agregar un reconocimiento SNII.</EstadoVacio>
          : <FormularioSnii profesores={profesores} />}
      </Panel>
      <Panel titulo={`Reconocimientos registrados (${reconocimientos.length})`}>
        {reconocimientos.length === 0 ? <EstadoVacio>Aún no hay reconocimientos SNII registrados.</EstadoVacio> : (
          <ul className="min-w-0">
            {reconocimientos.map((reconocimiento) => (
              <FilaSnii key={reconocimiento.id} reconocimiento={reconocimiento} profesores={profesores} />
            ))}
          </ul>
        )}
      </Panel>
    </Marco>
  );
}