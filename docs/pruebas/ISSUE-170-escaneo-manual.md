# Issue #170: escaneo manual de Coordinación

Fecha: 2026-11-09. Rama: `feat/M6-RF-020-escaneo-manual-coordinacion`.

- Server Action protegida por `requireRol(["COORDINADOR"])` antes de leer o iniciar trabajos. Administrador consulta resultados sin formulario ejecutable; Docente conserva la denegación de acceso al módulo.
- Cron retirado de `vercel.json`; endpoint antiguo responde 410 sin leer, crear o continuar trabajos. No se modificó el despliegue activo: el cambio se aplicará cuando una persona integre y despliegue el PR.
- Continuación explícita al volver a la pantalla, manteniendo Job, alcance y fecha de inicio. La actualización de avance no se presenta como finalización.
- Inicio serializado mediante transacción y `pg_advisory_xact_lock`; si existe trabajo pendiente, se ofrece continuarlo. Se mantienen las reservas de diez minutos y la recuperación por profesor.
- Fechas en formato de 24 horas, con zona America/Mexico_City indicada. No hay cambios de esquema ni migraciones.

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 618 pruebas, 55 archivos; pasan |
| `npm run lint` | Pasa |
| `npm run typecheck` | Pasa |
| `npm run build` | Pasa |
| Chrome aislado en claro, oscuro y celular 390 × 844 | Pasa; capturas inspeccionadas |

La prueba `node src/app/produccion/escaneo-manual.navegador.mjs` usa una acción ficticia y un perfil temporal de Chrome. Verifica que abrir la pantalla no continúa automáticamente, que se envía el Job pendiente y que una búsqueda posterior no reutiliza su identificador. No se consultaron proveedores ni se escribieron datos de Supabase. Los controles de servidor se verificaron con permisos y Prisma simulados.

Limitaciones: falta revisar la pantalla con una sesión de Coordinación en el despliegue y medir el procesamiento de consultas reales. La integración del historial completo corresponde a #169. El bloqueo asesor se prueba mediante dobles de la transacción; no se ejecutaron escrituras concurrentes en la base compartida. Revisión independiente pendiente.
