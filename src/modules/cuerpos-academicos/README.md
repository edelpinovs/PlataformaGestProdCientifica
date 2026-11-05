# cuerpos-academicos

Reglas de negocio, servicios y esquemas Zod de este módulo. Dueño y RF: `src/modules/registry.ts`.

## RF-012 · CU-007

Registrar un Cuerpo Académico con clave, nombre, nivel de consolidación, área PRODEP, disciplina y departamento. La clave no se duplica.

El esquema de Prisma también exige año de registro y de vencimiento; van en el mismo formulario. El vencimiento no puede ser anterior al registro.

Editar y eliminar siguen la regla #59 (`src/app/cuerpos-academicos/fila.tsx`). No se borra un CA con integrantes o LGAC (Prisma haría `Cascade`).

## RF-013 · CU-008

Asignar profesores de Tiempo Completo como integrantes. El primer integrante debe tener Perfil Deseable PRODEP vigente. Si el PRODEP de alguien ya venció, se puede quitar o cambiar integrantes: la regla solo bloquea un cambio que empeore la situación (había PRODEP vigente y ya no lo habría).

`tieneProdepActivo` vive aquí mientras I3 (@Ared11) entrega `tiene_prodep_activo()`: dictamen APROBADO y vigencia que cubre hoy (misma regla que el panel de inicio). El listado solo ofrece profesores de tiempo completo con estatus laboral activo, agrupados con o sin PRODEP vigente.

Pantalla: `/cuerpos-academicos/[id]`. Editar cambia el profesor del vínculo; eliminar no deja al CA sin el último PRODEP vigente.

## Pendiente

- RF-014 líder único, que sea integrante
- RF-015 LGAC asociadas al CA
