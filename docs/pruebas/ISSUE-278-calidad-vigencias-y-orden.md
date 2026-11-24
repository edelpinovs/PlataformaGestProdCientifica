# Prueba del #278 (parcial): vigencias vencidas y orden natural en Calidad de datos

| Campo | Valor |
|---|---|
| Issue | [#278](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/278) (el PR **no lo cierra**: quedan puntos pendientes, apartado 3) |
| Rama | `feat/M1-278-calidad-datos` → `main` |
| Fecha | 2026-11-24 |
| Lo preparó | I1 (`@edelpinovs`) con ayuda de un agente de IA |
| Entorno | Local (Windows 10, Node 24), PowerShell, sin base de datos |

## 1. Qué cambia

Solo el módulo `administracion`. Sin esquema, migración ni dependencias; de Reportes solo se **importan** funciones ya existentes.

| Punto del #278 | Cambio | Archivos |
|---|---|---|
| Vigencias vencidas | Nueva regla `VIGENCIA_VENCIDA`: toma las filas que arma Reportes (`cargarVigencias`) y reporta las que su semáforo pinta de rojo. No hay segunda copia de la regla de vencimiento. Enlaza a `/reportes?semaforo=ROJO&q=<nombre>` | `modules/administracion/calidad.ts`, `app/administracion/calidad/cargar.ts` |
| Orden natural de «Registro» | La comparación usa `localeCompare(..., { numeric: true })`: `UDG-CA-2` va antes que `UDG-CA-10`, en ambos sentidos | `modules/administracion/calidad.ts` |

## 2. Pruebas

Se ejecutaron desde PowerShell con la ruta `C:\PROJECTS\…` (con la letra de unidad en minúscula, vitest falla en esta máquina).

| Chequeo | Resultado |
|---|---|
| `npm test` | 117 archivos y 1,343 pruebas pasan (nuevas: solo rojo entra, texto y enlace en español, sin vencidas no hay hallazgos, el filtro acepta la regla, orden natural ascendente y descendente) |
| `npm run lint` | Sin errores |
| `npm run typecheck` | Sin errores |
| `npm run build` | Pasa |
| Pantalla en el navegador | **No revisada** (claro, oscuro y celular): pendiente con una cuenta de administrador y datos ficticios |

## 3. Lo que falta del #278

- **Homónimos sin resolver:** necesita que el dueño de Validación exponga su regla.
- **«Sin perfil de acceso» enlaza a un lugar donde corregir:** depende de #275 (invitar usuarios, D-242).
- **D-227 y D-229 siguen abiertas:** mientras tanto, una persona con un periodo anterior vencido y uno vigente aparece con el anterior en rojo (D-227). Puede dar hallazgos que no corresponden; al acordarse la regla, el hallazgo cambia junto con el semáforo.
- **Excepción a D-009** (hallazgos filtrados, ordenados y paginados en memoria): sigue justificada en el código; se revisa si la lista crece.
