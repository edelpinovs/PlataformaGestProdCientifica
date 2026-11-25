# Prueba del #277 (parcial): filtro por periodo y búsqueda por fecha en la bitácora

| Campo | Valor |
|---|---|
| Issue | [#277](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/277) (el PR **no lo cierra**: quedan puntos pendientes, apartado 3) |
| Rama | `feat/M1-277-bitacora-fecha` → `main` |
| Fecha | 2026-11-24 |
| Lo preparó | I1 (`@edelpinovs`) con ayuda de un agente de IA |
| Entorno | Local (Windows 10, Node 24), PowerShell, sin base de datos |

## 1. Qué cambia

Solo el módulo `administracion`. Sin esquema, migración ni dependencias, y sin tocar `src/lib/` ni `src/components/`.

| Punto del #277 | Cambio | Archivos |
|---|---|---|
| Búsqueda que cubra «Fecha» (D-009) | La búsqueda libre acepta `2026`, `2026-11` o `2026-11-24` y filtra por esa fecha en hora de Ciudad de México, igual que «Alta» en Usuarios | `modules/administracion/auditoria-listado.ts`, `app/administracion/auditoria/page.tsx` |
| Filtro por fecha | Filtro «Periodo» con valores finitos: Hoy, Últimos 7 días, Últimos 30 días y Este mes. Los días son los de Ciudad de México (a las 23:30 del 24 en México, «Hoy» sigue siendo el 24 aunque en UTC ya sea el 25) | `modules/administracion/fechas.ts`, `auditoria-listado.ts` |
| Exportación | La descarga conserva el periodo y lo anota en la bitácora de exportaciones («periodo «Últimos 30 días»») | `modules/administracion/exportar.ts` |

**Por qué periodos y no dos calendarios:** el listado compartido (`src/lib/listados/consulta.ts`) solo admite filtros de valores finitos. Un rango libre «desde–hasta» exige ampliar esa pieza compartida, que se acuerda antes con el equipo (`AGENTS.md`). Con periodos se cubre la necesidad sin tocarla.

## 2. Pruebas

Se ejecutaron desde PowerShell con la ruta `C:\PROJECTS\…`.

| Chequeo | Resultado |
|---|---|
| `npm test` | 117 archivos y 1,349 pruebas pasan (nuevas: búsqueda por año, mes y día en hora de México, fecha inexistente, los cuatro periodos, el día 24 a las 23:30 en México, periodo inválido con aviso, cruce de mes y de año, descripción de la exportación) |
| `npm run lint` | Sin errores |
| `npm run typecheck` | Sin errores |
| `npm run build` | Pasa |
| Pantalla en el navegador | **No revisada** (claro, oscuro y celular): pendiente con una cuenta de administrador y datos ficticios |

## 3. Lo que falta del #277

- **Rango libre «desde–hasta»:** requiere ampliar `src/lib/listados/consulta.ts` (filtro con validador propio); acordarlo antes.
- **Función compartida en `src/lib/`** para escribir la bitácora desde cualquier módulo, en la misma transacción que el cambio, y **registrar** dictámenes de validación, cargas confirmadas y borrados: toca `src/lib/` y módulos de otros, con acuerdo de sus dueños.
- **Resumen con correo de la persona afectada:** corregir el comentario de `prisma/schema.prisma` («nunca lleva datos de contacto») o el resumen; hoy se contradicen.
