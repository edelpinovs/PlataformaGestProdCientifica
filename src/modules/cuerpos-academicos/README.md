# cuerpos-academicos

Reglas de negocio, servicios y esquemas Zod de este módulo. Dueño y RF: `src/modules/registry.ts`.

## RF-012 · CU-007

Registrar un Cuerpo Académico con clave, nombre, nivel de consolidación, área PRODEP, disciplina y departamento. La clave no se duplica.

El esquema de Prisma también exige año de registro y de vencimiento; van en el mismo formulario. El vencimiento no puede ser anterior al registro.

Editar y eliminar siguen la regla #59 (`src/app/cuerpos-academicos/fila.tsx`). No se borra un CA con integrantes o LGAC (Prisma haría `Cascade`).

## RF-013 · CU-008

Asignar profesores de Tiempo Completo con estatus laboral activo como integrantes. El primer integrante debe tener Perfil Deseable PRODEP vigente. Si el PRODEP de alguien ya venció, se puede quitar o cambiar integrantes: la regla solo bloquea un cambio que empeore la situación (había PRODEP vigente y ya no lo habría).

`tieneProdepActivo` vive aquí mientras I3 (@Ared11) entrega `tiene_prodep_activo()` (issues #12–#16). Hay tres copias de la misma regla: esta función, la consulta Prisma de `src/lib/inicio.ts` y, cuando I3 la entregue, `tiene_prodep_activo()`. Unificarlas en el módulo de reconocimientos. El listado solo ofrece profesores de tiempo completo con estatus laboral activo, agrupados con o sin PRODEP vigente.

Pantalla: `/cuerpos-academicos/[id]`. Editar cambia el profesor del vínculo. Quitar al integrante y limpiar `liderId` van en la misma transacción; si esa persona era líder, el mensaje lo dice (designar líder único es RF-014).

## Pendiente

- RF-014 líder único, que sea integrante
- RF-015 LGAC asociadas al CA
