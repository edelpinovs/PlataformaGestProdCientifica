import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ConsultaListado, Paginacion } from "@/lib/listados/consulta";
import type { EstadoAutoria, FuentePublicacion } from "./bandeja";
import type { TipoPublicacion } from "./manual";
import { distribuirPagina, gruposEnumerados, ordenAutorias } from "./listados";

const incluir = { publicacion: true, profesor: { select: { id: true, nombres: true, apellidos: true, codigo: true } } } as const;

export async function consultarAutorias(filtro: Prisma.AutoriaWhereInput, consulta: ConsultaListado, paginacion: Paginacion) {
  const valores = gruposEnumerados(consulta);
  const leer = (where: Prisma.AutoriaWhereInput, salto: number, tamanio: number) => prisma.autoria.findMany({ where, orderBy: ordenAutorias(consulta), skip: salto, take: tamanio, include: incluir });
  if (!valores.length) return leer(filtro, paginacion.salto, paginacion.tamanio);
  const condicion = (valor: string): Prisma.AutoriaWhereInput => ({ AND: [filtro,
    consulta.orden === "estado" ? { estado: valor as EstadoAutoria }
      : consulta.orden === "tipo" ? { publicacion: { tipo: valor as TipoPublicacion } }
      : { publicacion: { fuente: valor as FuentePublicacion } },
  ] });
  // Conteos por los pocos valores finitos; solo se recuperan las diez filas de la página.
  const grupos = await Promise.all(valores.map(async valor => ({ valor, total: await prisma.autoria.count({ where: condicion(valor) }) })));
  const partes = distribuirPagina(grupos, paginacion.salto, paginacion.tamanio);
  const filas = await Promise.all(partes.map(p => leer(condicion(p.valor), p.salto, p.tamanio)));
  return filas.flat();
}
