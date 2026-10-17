# Prueba del PR #57: pauta visual común, marco compartido y tema oscuro a elección

| Campo | Valor |
|---|---|
| PR | [#57](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/57) |
| Autor | @edelpinovs (con Claude Code) |
| Rama | `docs/pauta-diseno` → `main` |
| Commit probado | `cd4f1a4` |
| Fecha de la prueba | 2026-10-16 |
| Probó | Edel Pino |
| Entorno | Local (Windows 11, Node 24.15.0), `next dev` en el puerto 3001, base de datos de desarrollo (Supabase) |
| Resultado | **Aprobado.** Falta la aprobación en GitHub de otra persona del equipo, y acordar en el chat los cambios a `AGENTS.md` y `src/components/`, como piden las reglas del equipo. |

## 1. Alcance

Toda la app adopta el estilo del panel de inicio (PR #49). Detalle en la descripción del PR y en `docs/diseno/PAUTA_VISUAL.md`.

| Área | Archivos |
|---|---|
| Colores y tema | `src/app/globals.css`, `src/app/layout.tsx`, `src/components/selector-tema.tsx` |
| Estructura | `src/components/marco.tsx`, `src/components/pantalla-acceso.tsx`; se elimina `src/components/encabezado.tsx` |
| Piezas | `src/components/ui.tsx` |
| Pantallas migradas | Inicio, Catálogos (índice, grados, divisiones, departamentos), módulos pendientes, iniciar sesión, confirmar enlace, definir contraseña |
| Reglas | `AGENTS.md`, `docs/diseno/PAUTA_VISUAL.md`, `README.md`, `src/components/pauta-visual.test.ts` |

No toca reglas de negocio, Server Actions, permisos ni el esquema de Prisma.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 7 archivos, 48 pruebas (6 nuevas de la pauta) |
| `npm run lint` y `npm run typecheck` | Correcto |
| `npm run build` | Correcto. El CSS generado contiene los colores con nombre y la variante oscura ligada a `data-tema`, y ningún `teal` |
| La prueba de la pauta detecta violaciones | Correcto: una página inyectada con hexadecimal, `teal-700`, `text-white`, `dark:bg-neutral-900`, `rgb()` y sin `Marco` hizo fallar las 5 reglas, cada una con archivo, línea y arreglo. La página se borró |
| Contraste de los colores | Correcto: todos los pares de texto y fondo ≥ 4.5:1 en claro y en oscuro (mínimo 4.60) |

## 3. Pruebas manuales

| # | Caso | Resultado | Evidencia |
|---|---|---|---|
| 1 | Inicio se ve igual que antes, ahora con `Marco` | Correcto | Visita registrada en el servidor; confirmado por el revisor |
| 2 | Catálogos y sus tres pantallas usan el menú lateral, paneles y formularios nuevos | Correcto | Visitas a `/catalogos`, `/catalogos/grados`, `/catalogos/divisiones` y `/catalogos/departamentos` en el servidor; confirmado por el revisor |
| 3 | El botón *Tema oscuro* cambia el tema y se mantiene al recargar | Correcto | Confirmado por el revisor. El cambio ocurre en el navegador y no deja rastro en el servidor |
| 4 | Vista de celular: el menú pasa a una fila horizontal | Correcto | Confirmado por el revisor |
| 5 | Inicio de sesión con el estilo nuevo | Correcto | Visita a `/login` en el servidor; confirmado por el revisor |
| 6 | Mensaje de error de un formulario con el estilo nuevo | **No probado** | No hubo envíos de formulario durante la revisión. La lógica de validación no cambió y sus pruebas pasan; solo cambia la presentación (`Aviso`) |

## 4. Pendiente

- Revisar el caso 6 en la vista previa de Vercel o en la siguiente prueba de un PR de catálogos.
- Departamentos (#56) sigue usando `texto()` sin validación de formato en nombre y nomenclatura, a diferencia de grados y divisiones. Queda fuera de este PR.

## 5. Dictamen

Se aprueba la integración del PR #57 a `main`, una vez que otra persona del equipo lo apruebe en GitHub y se acuerden en el chat los cambios a `AGENTS.md` y `src/components/`.
