# Revisión del PR #345: los avisos del formulario de acceso salen en español y no en el idioma de Chrome

Revisión del [PR #345](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/345) de `edelpinovs` (I1), rama `fix/login-mensajes-validacion-espanol` → `main`. Es un arreglo aparte, sin issue que cerrar (`Refs #282`): al escribir un correo sin `@` en el acceso, Chrome mostraba «Please include an '@' in the email address…» en lugar del mensaje en español de la aplicación. Va contra la regla de `AGENTS.md`: ningún texto de una librería o del sistema llega a la pantalla.

| Campo | Valor |
|---|---|
| PR | #345 (sin issue; `Refs #282`) |
| Autor | @edelpinovs (I1) |
| Commit revisado | `bd0eeba` |
| Fecha de la revisión | 2026-11-25 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24, Chrome sin interfaz con perfil aislado): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. Sin base de datos ni sesión real; la acción del servidor se simuló en la prueba de navegador |
| Resultado | **Aprobable.** El arreglo es mínimo, correcto y está probado; solo quedan observaciones menores y el pendiente que el propio PR menciona |

El autor y quien pidió esta revisión son la misma persona, así que la aprobación de otra persona del equipo (D-006) sigue haciendo falta.

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/login/formulario.tsx` | `noValidate` en el formulario (valida el servidor, que ya responde en español con Zod); `aria-invalid` en los dos campos cuando hay error. Se conservan `required` y `type="email"` para el teclado del celular y los gestores de contraseñas |
| `src/app/login/formulario.test.tsx` (nuevo) | 3 pruebas: `noValidate`, campos obligatorios y de tipo correo, y que no se marquen inválidos antes de intentar |
| `src/app/login/actions.test.ts` | 3 pruebas más: correo sin arroba, correo o contraseña vacíos y envío sin campos devuelven «Escribe un correo válido y tu contraseña.», conservan el correo y no consultan a Supabase |

Tres archivos, +62 / −3 líneas. Sin cambios de reglas de negocio, permisos, esquema, migración ni dependencias. No toca `src/components/`, `src/lib/` ni `prisma/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 127 archivos, **1508 pruebas, todas pasan** (la descripción dice 1507 de 1508, con `produccion/conectores/http.test.ts` fallando; en esta revisión pasó) |
| `npm run lint` y `npm run typecheck` | Correctos |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se leyó y está bien

- **Causa bien identificada:** con `type="email"` y `required`, el navegador valida antes de enviar y el texto sale en el idioma de Chrome; la página no puede traducirlo ni evitar que tape el mensaje propio.
- **El servidor ya cubría todo:** `iniciarSesion` valida con Zod (`z.email()`, `z.string().min(1)`) y responde con un mensaje fijo en español; un campo ausente (`formData.get` devuelve `null`) también falla la validación y no lanza excepción. No se consulta a Supabase con datos inválidos (lo prueba el PR).
- **No se pierde utilidad de los campos:** `type="email"` sigue dando el teclado con arroba y el autocompletado; el navegador sigue quitando los espacios al principio y al final del correo, así que `noValidate` no hace que un correo pegado con un espacio sobrante falle en el servidor.
- **Accesibilidad:** `aria-invalid` en ambos campos con error (lo pedía la pauta) y el aviso sigue siendo `<Aviso tipo="error">` con `role="alert"`.
- **Sigue la pauta visual:** sin colores nuevos ni clases fuera de las piezas de `@/components/ui`.

## 4. Pruebas de revisión en el navegador

Prueba temporal con el `FormularioLogin` real, con la acción simulada (se borró después), en claro, oscuro y celular (390 px):

| Qué comprueba | Resultado |
|---|---|
| El formulario tiene `noValidate`; los campos conservan `type="email"` y `required` | Correcto |
| Correo `docente.prueba282` (sin arroba) y contraseña vacía: el envío **llega a la acción** (no lo frena el navegador) | Correcto |
| Aparece «Escribe un correo válido y tu contraseña.» en el aviso rojo; ambos campos pasan a `aria-invalid="true"`; el correo escrito se conserva | Correcto |
| Sin desbordamiento horizontal | Correcto en las tres vistas |
| Control: con `noValidate` quitado a mano, el navegador **bloquea** el envío y muestra «Please include an '@'…» | Confirma el problema original y que el arreglo es lo que lo evita |

Las capturas que quedaron guardadas se tomaron después del paso de control, por eso muestran la burbuja nativa en inglés junto al aviso rojo: es el control, no un fallo del PR. Se vio el acceso en tema claro, oscuro y celular, que la descripción del PR dice no haber visto. No se probó con lector de pantalla ni con la acción real contra Supabase.

## 5. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Menor | `formulario.test.tsx` comprueba `aria-invalid="false"` al inicio pero no que pase a `"true"` cuando hay error (renderiza el componente sin estado de error). Lo cubrí con la prueba de navegador temporal; convendría una prueba permanente (por ejemplo, extraer el contenido del formulario para pasarle un estado) |
| 2 | Menor | La prueba de campos usa una expresión regular que depende del orden de los atributos que escribe React; un cambio de formato en el JSX la rompería sin que haya un fallo real |
| 3 | Pendiente (ya lo dice el PR) | Siguen con validación nativa `type="email"`, `number`, `date` o `url` los formularios de Profesores, Convocatorias, Producción, Reconocimientos y Validación (14 apariciones en 10 archivos). Quitarla exige que cada acción del servidor responda en español a lo que hoy frena el navegador. Conviene un issue aparte con una solución común |

## 6. Dictamen

**Aprobable.** Puede integrarse cuando otra persona del equipo lo apruebe. Los hallazgos 1 y 2 son opcionales; el 3 pide abrir un issue.
