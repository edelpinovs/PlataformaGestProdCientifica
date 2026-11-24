import { ETIQUETA_ROL, ROLES } from "@/lib/auth/roles";
import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import { normalizar } from "@/modules/catalogos/comun";

// Listado de usuarios y roles con búsqueda, filtros, orden y paginación (regla D-009).
// Estados: «Invitado» llegará cuando se acuerde cómo se invita (D-242).

export const ESTADOS_USUARIO = [
  { valor: "ACTIVO", texto: "Activo" },
  { valor: "DESACTIVADO", texto: "Desactivado" },
] as const;

export const LISTADO_USUARIOS: DefinicionListado = {
  columnas: ["correo", "rol", "profesor", "estado"],
  ordenInicial: { columna: "correo", dir: "asc" },
  filtros: { rol: ROLES, estado: ESTADOS_USUARIO.map((e) => e.valor) },
};

export const COLUMNAS_USUARIOS = [
  { clave: "correo", texto: "Correo" },
  { clave: "rol", texto: "Rol" },
  { clave: "profesor", texto: "Profesor vinculado" },
  { clave: "estado", texto: "Estado" },
];

/**
 * La búsqueda libre cubre lo que muestra el listado: correo, rol, profesor (nombre, apellidos y
 * código) y estado. Rol y estado se guardan como valores internos, así que se busca por su texto.
 */
export function filtroUsuarios(consulta: ConsultaListado) {
  const texto = normalizar(consulta.q.trim());
  const porTexto = condicionTexto(consulta.q, (contiene) => [
    { correo: contiene },
    { profesor: { nombres: contiene } },
    { profesor: { apellidos: contiene } },
    { profesor: { codigo: contiene } },
  ]);

  const alternativas: object[] = [...(porTexto.OR ?? [])];
  if (texto) {
    const roles = ROLES.filter((r) => normalizar(ETIQUETA_ROL[r]).includes(texto));
    if (roles.length) alternativas.push({ rol: { in: roles } });
    for (const estado of ESTADOS_USUARIO) {
      if (normalizar(estado.texto).includes(texto)) alternativas.push({ activo: estado.valor === "ACTIVO" });
    }
  }

  return {
    ...(alternativas.length ? { OR: alternativas } : {}),
    ...(consulta.filtros.rol ? { rol: consulta.filtros.rol as (typeof ROLES)[number] } : {}),
    ...(consulta.filtros.estado ? { activo: consulta.filtros.estado === "ACTIVO" } : {}),
  };
}

export function ordenUsuarios(consulta: ConsultaListado) {
  return ordenarPor(consulta, {
    correo: (dir) => ({ correo: dir }),
    rol: (dir) => ({ rol: dir }),
    profesor: (dir) => ({ profesor: { apellidos: dir } }),
    estado: (dir) => ({ activo: dir }),
  });
}
