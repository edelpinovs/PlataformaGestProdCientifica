# Prueba del PR #49: Convierte el inicio en un panel de resumen

| Campo | Valor |
|---|---|
| PR | [#49](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/49) |
| Autor | @layon-king |
| Rama | `feat/inicio-panel` → `main` |
| Commit probado | `0817b33` |
| Fecha de la prueba | 2026-10-16 |
| Probó | Edel Pino |
| Entorno | Local (Windows 11, Node 24.15.0), `next dev` en el puerto 3001, base de datos de desarrollo (Supabase) |
| Resultado | **Aprobado, con pendientes** (ver sección 5) |

## 1. Alcance del cambio

El PR modifica 3 archivos y no toca el esquema de Prisma ni las dependencias:

| Archivo | Cambio |
|---|---|
| `src/app/page.tsx` | El inicio pasa a renderizar el panel. |
| `src/components/panel-inicio.tsx` | Nuevo: menú de módulos, tarjetas, gráficas, tabla y dona. |
| `src/lib/inicio.ts` | Nuevo: consultas del resumen (`cargarInicio(rol)`). |

Comportamiento esperado, según la descripción del PR:

- Menú con los módulos del rol, cuatro conteos reales, producción y vigencias del año en curso, y reconocimientos por vencer.
- Los nombres de profesores solo se muestran a `ADMINISTRADOR` y `COORDINADOR` (en el código: `muestraNombres = rol !== "DOCENTE"`).
- En pantallas estrechas el menú queda en una fila horizontal.

## 2. Cómo se preparó la prueba

Se usó un `git worktree` aparte para no tocar el trabajo en curso de otra rama:

```bash
git fetch origin feat/inicio-panel
git worktree add ../prueba-pr49 -b feat/inicio-panel origin/feat/inicio-panel
cp .env ../prueba-pr49/.env
cd ../prueba-pr49
npm install
npx next dev -p 3001
```

## 3. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| CI de GitHub (`verificar`) | Correcto |
| Vista previa de Vercel | Correcto |
| `npm run typecheck` (local) | Correcto |
| `npm test` (local) | Correcto: 2 archivos, 6 pruebas |

El PR no agrega pruebas automáticas para `src/lib/inicio.ts`.

## 4. Pruebas manuales

| # | Caso | Usuario / condición | Resultado | Evidencia |
|---|---|---|---|---|
| 1 | Iniciar sesión y abrir el inicio | `ADMINISTRADOR` | Correcto | Captura del panel |
| 2 | Se muestran las 4 tarjetas (Profesores, SNII vigente, PRODEP activo, Cuerpos académicos) | `ADMINISTRADOR` | Correcto, todas en 0 | Captura del panel |
| 3 | Se muestran las 2 gráficas (Producción científica, Vigencias del año) con meses Ene–Dic y el mes actual resaltado | `ADMINISTRADOR` | Correcto, con el mensaje "Sin registros en este año" | Captura del panel |
| 4 | Tabla "Reconocimientos por vencer" con el enlace "Ver módulo" | `ADMINISTRADOR` | Correcto, con el estado vacío "No hay reconocimientos vigentes por mostrar" | Captura del panel |
| 5 | Dona "SNII vigente" por nivel | `ADMINISTRADOR` | Correcto, en 0 | Captura del panel |
| 6 | El menú lateral lista los módulos del rol y marca "Inicio" como activo | `ADMINISTRADOR` | Correcto | Captura del panel |
| 7 | La cabecera muestra el correo y el rol del usuario | `ADMINISTRADOR` | Correcto | Captura del panel |

## 5. Pendientes y limitaciones

1. **Datos vacíos.** La base de desarrollo no tenía profesores, producción ni reconocimientos. Se comprobó que el panel se muestra bien sin datos, pero no se comprobó que los conteos, las gráficas y la dona calculen bien con registros reales.
2. **Rol `DOCENTE` sin probar.** Falta entrar como docente y confirmar que no aparecen nombres de profesores.
3. **Rol `COORDINADOR` sin probar.** Falta confirmar que ve los nombres y el menú que le corresponde.
4. **Vista estrecha sin probar.** Falta comprobar que el menú queda en una fila horizontal.
5. **Navegación sin probar.** Falta abrir un módulo desde el menú y volver al inicio.
6. **Sin pruebas automáticas** para las consultas de `src/lib/inicio.ts`.

Ninguno de estos puntos bloquea la integración. Los puntos 1 a 5 se pueden cerrar en cuanto haya datos de prueba cargados.

## 6. Dictamen

Se aprueba la integración del PR #49 a `main`. El panel carga correctamente para `ADMINISTRADOR`, el CI está en verde, el cambio no toca el esquema y no introduce dependencias. Los pendientes de la sección 5 quedan para una segunda verificación con datos reales.
