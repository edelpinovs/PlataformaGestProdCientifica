import { Prisma } from "@/generated/prisma/client";
import { escaparBusqueda, type ConsultaListado } from "@/lib/listados/consulta";

/** Resúmenes calculados: se cuentan y paginan en SQL, sin cargar todas las filas. */
export function consultaResumen(vista: "profesores" | "departamentos", consulta: ConsultaListado, profesorId?: number) {
  const limiteProfesor = profesorId === undefined ? Prisma.empty : Prisma.sql`WHERE p.id = ${profesorId}`;
  const agrupada = vista === "profesores"
    ? Prisma.sql`SELECT p.id, p.apellidos || ', ' || p.nombres AS nombre, p.codigo,
        COALESCE(d.nomenclatura, '—') AS departamento, COUNT(a."publicacionId")::int AS validadas
        FROM "Profesor" p LEFT JOIN "Departamento" d ON d.id = p."departamentoId"
        LEFT JOIN "Autoria" a ON a."profesorId" = p.id AND a.estado = 'VALIDADA'
        ${limiteProfesor} GROUP BY p.id, d.nomenclatura`
    : Prisma.sql`SELECT d.id, d.nombre, d.nomenclatura, COUNT(a."publicacionId")::int AS validadas
        FROM "Departamento" d LEFT JOIN "Profesor" p ON p."departamentoId" = d.id
        LEFT JOIN "Autoria" a ON a."profesorId" = p.id AND a.estado = 'VALIDADA'
        ${limiteProfesor} GROUP BY d.id`;
  const texto = `%${escaparBusqueda(consulta.q)}%`;
  const columnas = vista === "profesores" ? [Prisma.sql`nombre`, Prisma.sql`codigo`, Prisma.sql`departamento`, Prisma.sql`validadas::text`] : [Prisma.sql`nombre`, Prisma.sql`nomenclatura`, Prisma.sql`validadas::text`];
  const condiciones: Prisma.Sql[] = [];
  if (consulta.q) condiciones.push(Prisma.sql`(${Prisma.join(columnas.map(c => Prisma.sql`${c} ILIKE ${texto}`), " OR ")})`);
  if (vista === "profesores" && consulta.filtros.departamento) condiciones.push(Prisma.sql`departamento = ${consulta.filtros.departamento}`);
  const filtro = condiciones.length ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;
  const base = Prisma.sql`SELECT * FROM (${agrupada}) resumen ${filtro}`;
  const mapa: Record<string, Prisma.Sql> = { nombre: Prisma.sql`nombre`, codigo: Prisma.sql`codigo`, departamento: Prisma.sql`departamento`, nomenclatura: Prisma.sql`nomenclatura`, validadas: Prisma.sql`validadas` };
  const permitidas = vista === "profesores" ? ["nombre", "codigo", "departamento", "validadas"] : ["nombre", "nomenclatura", "validadas"];
  const columna = permitidas.includes(consulta.orden) ? mapa[consulta.orden] : mapa.validadas;
  const direccion = consulta.dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  return {
    contar: Prisma.sql`SELECT COUNT(*)::int AS total FROM (${base}) filtrado`,
    pagina: (salto: number, tamanio: number) => Prisma.sql`${base} ORDER BY ${columna} ${direccion}, id ${direccion} LIMIT ${tamanio} OFFSET ${salto}`,
  };
}
