# Prueba del PR #51: Prepara el login con SIIAU sin llamar a la API

| Campo | Valor |
|---|---|
| PR | [#51](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/51) |
| Autor | @layon-king |
| Rama | `feat/login-siiau` → `main` |
| Commit probado | `5213c76` más los cambios de la revisión (sección 4) |
| Fecha de la prueba | 2026-10-16 |
| Probó | Edel Pino |
| Entorno | Local (Windows 11, Node 24.15.0), `next dev` en el puerto 3001, base de datos de desarrollo (Supabase) |
| Resultado | **Aprobado con cambios de la revisión** (ver sección 4) |

## 1. Alcance del cambio

El PR prepara el login con código UDG contra SIIAU, sin activarlo. No toca el esquema de Prisma ni las dependencias.

| Archivo | Cambio |
|---|---|
| `src/lib/auth/siiau.ts` | Nuevo: tres funciones puras que interpretan las respuestas de SIIAU. Nada las llama todavía. |
| `src/app/login/actions.ts` | Comentario que señala dónde iría el login SIIAU. |
| `src/app/login/formulario.tsx` | Comentario sobre el futuro campo de código UDG. |
| `.env.example` | Las dos URLs de SIIAU, comentadas. |

Comportamiento esperado: el login con correo y contraseña funciona igual que antes y la app no hace ninguna petición a SIIAU.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| CI de GitHub (`verificar`) y vista previa de Vercel, sobre `5213c76` | Correcto |
| `npm run lint` (local, con los cambios de la revisión) | Correcto |
| `npm run typecheck` (local, con los cambios de la revisión) | Correcto |
| `npm test` (local, con los cambios de la revisión) | Correcto: 3 archivos, 16 pruebas (10 nuevas en `siiau.test.ts`) |

## 3. Pruebas manuales

| # | Caso | Resultado | Evidencia |
|---|---|---|---|
| 1 | El formulario de `/login` pide correo y contraseña, sin campo de código UDG | Correcto | El HTML de `/login` solo envía `correo` y `contrasena` |
| 2 | Ninguna parte del código hace peticiones a `148.202.89.11` | Correcto | Búsqueda en `src/`: la IP solo aparece en `docs/diseno/LOGIN_SIIAU.md` y comentada en `.env.example` |
| 3 | Las funciones de `siiau.ts` no se llaman desde la app | Correcto | Búsqueda en `src/`: solo las usa `siiau.test.ts` |
| 4 | Iniciar sesión con correo y contraseña entra como antes | Correcto | Confirmado en el navegador por Edel Pino |
| 5 | Una contraseña incorrecta muestra "El correo o la contraseña no coinciden" | Correcto | Confirmado en el navegador por Edel Pino |

## 4. Revisión de código y cambios hechos

Hallazgos de la revisión:

| # | Gravedad | Hallazgo | Qué se hizo |
|---|---|---|---|
| 1 | Alta (diseño) | La app corre en Vercel, en internet pública, y SIIAU (`148.202.89.11`) solo responde dentro de la red UDG | Queda como decisión pendiente en `docs/diseno/LOGIN_SIIAU.md` |
| 2 | Alta (seguridad) | Las URLs son `http`, sin cifrar, y la copia local guardaría la contraseña UDG en Supabase Auth | Queda como decisión pendiente (RNF-002) en el documento de diseño |
| 3 | Media | El boceto comentado tenía errores: `createUser` en cada login y una variable `correo` sin definir | Documentados en la sección 3 del diseño |
| 4 | Media | Las tres funciones exportadas no tenían pruebas | Se agregó `src/lib/auth/siiau.test.ts` |
| 5 | Baja | Unas 100 líneas de código comentado entraban a `main` | Se movieron a `docs/diseno/LOGIN_SIIAU.md`; el código deja un puntero a ese documento |

Los cambios los hizo el revisor en la rama del PR, con acuerdo del responsable del repositorio. El código del autor se conserva completo en el documento de diseño.

## 5. Dictamen

Se aprueba la integración del PR #51 a `main` con los cambios de la sección 4. Los casos 4 y 5 se confirmaron en el navegador antes de fusionar. El PR no cambia el comportamiento de la app. El login SIIAU no debe activarse hasta resolver las decisiones de `docs/diseno/LOGIN_SIIAU.md`.
