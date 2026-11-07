# Issue #139: demostración del escaneo en desarrollo

## Activación local

En PowerShell, desde la raíz del proyecto:

```powershell
$env:PRODUCCION_DEMO = "1"
npm.cmd run dev
```

Iniciar sesión con acceso a Producción (administración o coordinación), abrir Escanear y pulsar Abrir demostración sin base de datos. Ruta: /produccion/demostracion.

Para desactivar, detener el servidor, ejecutar `Remove-Item Env:PRODUCCION_DEMO` y volver a iniciarlo. No configurar esta bandera en Vercel: la demostración se bloquea siempre con NODE_ENV production, también en Preview.

## Recorrido

1. Dejar el año vacío y escanear Elena: 3 entradas simuladas se consolidan en 2 obras (2018 y 2023), con 2 autorías.
2. Repetir: siguen 2 obras y 2 autorías; el corte limita la búsqueda a novedades y puede devolver cero entradas.
3. Escanear Tomás sin año: siguen 2 obras, ahora con 4 autorías.
4. Validar autorías de Elena y rechazar las de Tomás. Indicar 2018 o 2023 y reescanear: se conservan los estados y no aparecen nuevas autorías.
5. Reiniciar demostración o recargar: vacía la memoria de esa pestaña. Otras pestañas y la base no cambian.

La simulación usa el motor y deduplicador reales mediante conectores inyectados y repositorio en memoria. No importa Prisma, no realiza HTTP ni escribe profesores, publicaciones, trabajos o cortes en Supabase. Los datos vuelven del navegador a la Server Action y se validan con Zod con límites; permisos y bandera se comprueban en cada petición. La memoria no es un registro confiable ni persistente: es solo una ayuda de demostración.

El cambio de estados simula la persistencia de autorías; no ejecuta el módulo de Validación. Los resultados tienen como máximo dos tarjetas y cuatro autorías por diseño: quedan exentos de paginación, búsqueda y edición/eliminación de registros reales. Reiniciar es el control de limpieza de esta simulación acotada.

## Verificación

577 pruebas, lint y typecheck correctos; build correcto. Pruebas de historial, incremental, año explícito, deduplicación, coautorías, estados, reinicio, independencia de snapshots, ausencia de HTTP, permisos y bloqueo fuera de desarrollo. Sin datos reales ni escrituras en base.

Revisión visual en claro, oscuro y celular pendiente: la herramienta de navegador no inició (failed to write kernel assets, error 3). Depende del PR #134 por la recuperación del historial inicial; cambiar la base a main tras integrarlo. El conteo de pruebas corresponde a esta rama, sin cambios independientes de otros PR.
