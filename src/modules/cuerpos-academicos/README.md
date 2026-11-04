# cuerpos-academicos

Reglas de negocio, servicios y esquemas Zod de este módulo. Dueño y RF: `src/modules/registry.ts`.

## RF-012 · CU-007

Registrar un Cuerpo Académico con clave, nombre, nivel de consolidación, área PRODEP, disciplina y departamento. La clave no se duplica.

El esquema de Prisma también exige año de registro y de vencimiento; van en el mismo formulario. El vencimiento no puede ser anterior al registro.

Editar y eliminar siguen la regla #59 (`src/app/cuerpos-academicos/fila.tsx`). No se borra un CA con integrantes o LGAC (Prisma haría `Cascade`).

## Pendiente

- RF-013 integrantes de tiempo completo con PRODEP activo
- RF-014 líder único, que sea integrante
- RF-015 LGAC asociadas al CA
