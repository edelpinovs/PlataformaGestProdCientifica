# Pauta visual de la plataforma

Toda la plataforma usa el estilo del panel de inicio (PR #49): marco blanco redondeado sobre fondo lavanda, menú lateral, acento violeta y paneles sin borde. El tema claro es el predeterminado; el oscuro lo elige cada persona desde el menú.

Esta pauta vale para personas y agentes de IA. Las reglas obligatorias para agentes están en `AGENTS.md`, sección *Diseño visual*. La prueba `src/components/pauta-visual.test.ts` las hace cumplir en el CI.

## 1. Dónde está cada cosa

| Archivo | Qué contiene |
| --- | --- |
| `src/app/globals.css` | Los colores con nombre, en versión clara y oscura |
| `src/app/layout.tsx` | Aplica el tema guardado antes de pintar la página |
| `src/components/marco.tsx` | `Marco`: menú lateral, encabezado y zona de contenido de toda página con sesión |
| `src/components/pantalla-acceso.tsx` | `PantallaAcceso`: tarjeta centrada para iniciar sesión, confirmar enlace y definir contraseña |
| `src/components/ui.tsx` | Piezas: `Panel`, `EstadoVacio`, `Aviso`, `EtiquetaEstado`, `Icono` y las clases de botón, campo, etiqueta y tabla |
| `src/components/fila-editable.tsx` | `FilaEditable`: fila de listado con *Editar* y *Eliminar* (sección 7) |
| `src/components/selector-tema.tsx` | Botón *Tema oscuro* / *Tema claro* del menú |
| `src/components/pauta-visual.test.ts` | Prueba que impide colores sueltos y páginas sin `Marco` |

## 2. Colores

Se usan por su nombre: `bg-marca`, `text-texto-3`, `border-linea`… En `style` se usa la variable: `var(--marca)`. Nunca un hexadecimal en un componente.

| Nombre | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `fondo` | `#EFEAF8` | `#0B0A12` | Fondo de la página, detrás del marco |
| `superficie` | `#FFFFFF` | `#16141F` | Marco, menú lateral, paneles y campos |
| `superficie-alt` | `#F7F5FC` | `#1C1A27` | Zona de contenido y estados vacíos |
| `hover` | `#F6F4FB` | `#221F2E` | Fondo al pasar el ratón por enlaces y botones secundarios |
| `linea` | `#EEEAF8` | `#2A2738` | Bordes de campos, separadores de tabla y del menú |
| `marca` | `#443CDE` | `#A39DF7` | Acento: elemento activo, enlaces, cifras destacadas, botón principal |
| `sobre-marca` | `#FFFFFF` | `#16141F` | Texto sobre fondo `marca` |
| `marca-suave` | `#EEE9FF` | `#2B2650` | Fondo del elemento activo del menú |
| `marca-tenue` | `#F3F0FF` | `#221F33` | Fondo de las tarjetas de métricas |
| `texto` | `#16141F` | `#EDEBF5` | Texto principal y títulos |
| `texto-2` | `#5C5872` | `#C4C1D4` | Texto secundario, celdas de tabla, enlaces del menú, etiquetas de campo |
| `texto-3` | `#6E6A86` | `#A19DB5` | Subtítulos, notas, encabezados de tabla |
| `exito` / `exito-suave` | `#065F46` / `#ECFDF5` | `#6EE7B7` / `#0F2A22` | Registro guardado; estado *vigente* |
| `aviso` / `aviso-suave` | `#92400E` / `#FFFBEB` | `#FCD34D` / `#2E2410` | Advertencias; estado *por vencer* |
| `peligro` / `peligro-suave` | `#B91C1C` / `#FEF2F2` | `#FCA5A5` / `#3A1616` | Errores; estado *vencido*; borde de campo con error |
| `grafica`, `grafica-2`, `grafica-acento` | `#C4B8F5`, `#DDD6FE`, `#7C6BF2` | `#4B4390`, `#3A3566`, `#8F86F5` | Barras de gráficas |

Todas las combinaciones de texto y fondo cumplen el contraste AA (4.5:1) en los dos temas. La más justa es `texto-3` sobre `marca-tenue`, con 4.60 en claro y 6.10 en oscuro. El gris `#8A86A3` del primer diseño del inicio quedó fuera porque daba 3.1 a 3.5.

Un color nuevo se agrega en `globals.css` con su valor claro y oscuro, se comprueba su contraste en ambos y se añade a esta tabla.

Los colores de los niveles SNII de la dona (`src/lib/inicio.ts`) son datos de una serie, no de interfaz, y se quedan ahí.

Los archivos de marca de `docs/diseno/marca/` (SVG y PNG de SIGeC, D-217) conservan sus colores originales. Es una excepción limitada a esos activos: no se copian a `.tsx` ni a `globals.css`, y los colores de interfaz siguen yendo por nombre.

## 3. Tema oscuro

- Predeterminado: claro. La persona cambia con el botón *Tema oscuro* del menú lateral, y su elección se guarda un año en la cookie `tema`.
- No sigue el tema del sistema operativo.
- Un script en `<head>` aplica la cookie antes de pintar, así no hay parpadeo (guía de Next.js *Preventing flash before hydration*).
- Los colores con nombre cambian solos. No se escriben clases `dark:` para colores; `dark:` solo sirve para mostrar u ocultar algo según el tema, como en el botón.

## 4. Tipografía

Fuente Geist en todo el sitio.

| Elemento | Clases |
| --- | --- |
| Título de página | Lo pone `Marco` o `PantallaAcceso` (`text-xl font-semibold tracking-tight`) |
| Subtítulo de página | Lo pone `Marco` (`text-sm text-texto-3`) |
| Título de panel | Lo pone `Panel` (`text-base font-semibold`) |
| Descripción de panel | Lo pone `Panel` (`text-xs text-texto-3`) |
| Cifra de métrica | `text-2xl font-semibold tracking-tight` |
| Texto normal, celdas y campos | `text-sm` |
| Encabezado de tabla | `claseTabla.encabezado` (`text-xs text-texto-3`) |
| Claves y nomenclaturas | `font-mono` |

Las cifras se formatean con `Intl.NumberFormat("es-MX")`.

## 5. Forma y espacio

| Elemento | Esquinas | Relleno |
| --- | --- | --- |
| Marco y tarjeta de acceso | `rounded-[28px]`, `shadow-marco` | — |
| Panel y tarjeta | `rounded-2xl`, sin borde ni sombra | `p-5` panel, `p-4` tarjeta de métrica |
| Botón, campo, enlace del menú | `rounded-xl` | `px-4 py-2.5` botón, `px-3 py-2.5` campo |
| Estado vacío y aviso | `rounded-xl` | `px-4 py-8` y `px-4 py-3` |
| Etiqueta de estado | `rounded-full` | `px-2.5 py-1 text-xs font-medium` |

Separación: `gap-4` dentro de una sección y `gap-5` entre secciones (la da `Marco`). Los paneles se distinguen del fondo por color, no por bordes.

## 6. Estructura de página

```
┌ fondo ─────────────────────────────────────────────────────┐
│ ┌ Marco (superficie, rounded-[28px]) ────────────────────┐ │
│ │ menú      │ ← volver                                   │ │
│ │ lateral   │ título + subtítulo                usuario  │ │
│ │ 240 px    │────────────────────────────────────────────│ │
│ │           │ contenido (superficie-alt)                 │ │
│ │           │  ┌ Panel ─────┐ ┌ Panel ─────┐             │ │
│ │ cuenta    │  └────────────┘ └────────────┘             │ │
│ │ y tema    │                                            │ │
│ └───────────┴────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

- **Menú lateral:** logotipo, *Inicio* y los módulos del rol con su icono. Abajo: *Cambiar contraseña*, *Tema oscuro* y *Cerrar sesión*. El módulo activo va en `marca-suave` con `aria-current="page"`.
- **Menos de 1024 px:** el menú pasa a una fila horizontal con desplazamiento y las opciones de cuenta suben junto al logotipo.
- **Encabezado:** enlace *volver* opcional, título y subtítulo a la izquierda; correo, rol y avatar a la derecha. El correo se oculta en celular.

## 7. Plantilla de pantalla nueva

Página de un módulo con un formulario y una tabla. Copia y adapta.

```tsx
// src/app/<modulo>/<pantalla>/page.tsx
import { Marco } from "@/components/marco";
import { claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FormularioCosa } from "./formulario";

export default async function CosasPage() {
  const perfil = await requireModulo("<modulo>");
  const cosas = await prisma.cosa.findMany({ orderBy: { nombre: "asc" } });

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="<modulo>" titulo="Cosas"
      volver={{ href: "/<modulo>", texto: "<Módulo>" }}>
      <Panel titulo="Registrar cosa">
        <FormularioCosa />
      </Panel>
      <Panel titulo={`Registradas (${cosas.length})`}>
        {cosas.length === 0 ? (
          <EstadoVacio>Aún no hay cosas registradas.</EstadoVacio>
        ) : (
          <table className={claseTabla.tabla}>…</table>
        )}
      </Panel>
    </Marco>
  );
}
```

```tsx
// src/app/<modulo>/<pantalla>/formulario.tsx
"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { registrarCosa, type EstadoCosa } from "./actions";

export function FormularioCosa() {
  const [estado, accion, enviando] = useActionState<EstadoCosa, FormData>(registrarCosa, {});

  return (
    <form key={estado.registrada ?? "formulario"} action={accion} className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className={`${claseEtiqueta} flex-1`}>
          Nombre
          <input name="nombre" required defaultValue={estado.valores?.nombre}
            aria-invalid={estado.campo === "nombre"} className={claseCampo(estado.campo === "nombre")} />
        </label>
        <button type="submit" disabled={enviando} className={claseBoton}>
          {enviando ? "Registrando…" : "Registrar"}
        </button>
      </div>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.registrada && <Aviso tipo="exito">Se registró «{estado.registrada}».</Aviso>}
    </form>
  );
}
```

Ejemplos reales: `src/app/catalogos/grados/` y `src/app/catalogos/departamentos/`.

### Filas con Editar y Eliminar

Todo listado ofrece *Editar* y *Eliminar* en cada fila a los roles que pueden registrar (regla de `AGENTS.md`, issue #59). La fila es el componente `<FilaEditable>` de `src/components/fila-editable.tsx`: la página le pasa las celdas, los campos editables (texto o lista de opciones) y las Server Actions `editar` y `eliminar`, que reciben `id` y los campos en el `FormData` y devuelven `EstadoFila`. Ejemplos: `src/app/catalogos/grados/`, `divisiones/` y `departamentos/`.

| Estado de la fila | Qué muestra |
| --- | --- |
| Normal | Datos y, a la derecha, `Editar` (`claseAccionFila()`) y `Eliminar` (`claseAccionFila(true)`), con `aria-label` que nombra el registro |
| Editando | La fila se abre a todo el ancho sobre `bg-superficie-alt`: campos con las reglas del alta, `Guardar` (`claseBoton`) y `Cancelar` (`claseBotonSecundario`) |
| Confirmando | La fila se abre sobre `bg-peligro-suave`: pregunta con el nombre del registro, `Eliminar` (`claseBotonPeligro`) y `Cancelar` |
| Error | `Aviso tipo="error"` dentro de la fila; si no se puede borrar, explica por qué y el botón pasa a `Cerrar` |

Edición y confirmación son subcomponentes que se montan de nuevo al abrirse, para no arrastrar errores anteriores. Tras guardar o eliminar, la acción redirige al listado con un aviso de éxito (`RedirectType.replace`). Nada de ventanas del navegador (`confirm()`).

### Listados: paginación, búsqueda y orden

Todo listado de registros sigue estas tres reglas (acuerdo D-009). El estado vive en la URL, así que se puede compartir y volver con el botón Atrás.

| Regla | Qué hace | Parámetro |
| --- | --- | --- |
| Paginación | 10 filas por página; «Mostrando a–b de N» y navegación Anterior/Siguiente. Una página fuera de rango muestra la última | `pagina` |
| Búsqueda | Un cuadro de texto libre que busca en cualquier campo que muestra el listado (sin distinguir mayúsculas); escapa `%`, `_` y `\`. Cambiarla vuelve a la página 1 | `q` |
| Orden y filtro | Cada encabezado con datos es un enlace que ordena de forma ascendente o descendente (texto A–Z, números y fechas según su tipo) y lleva `aria-sort`. Las columnas de valores finitos (estado, tipo, división…) se filtran con una lista. Cambiarlos vuelve a la página 1 | `orden`, `dir` y un parámetro por filtro |

- **Validación:** los parámetros se validan en el servidor con Zod; el nombre de la columna se acepta solo si está en una lista permitida y nunca se pasa directo a `orderBy`. Un valor inválido muestra un aviso en español y no cambia la consulta.
- **Consulta:** `count` y `findMany` con `skip`/`take`, y desempate por `id` para que el orden sea estable.
- **Celular:** si las columnas se apilan y el encabezado se oculta, el listado ofrece un selector «Ordenar por» con las mismas columnas.
- **Pieza compartida:** no repitas el código. Las reglas puras están en `src/lib/listados/consulta.ts` (con su prueba) y las piezas de interfaz en `src/components/listado.tsx`. Cada módulo solo declara sus columnas, filtros y campos de búsqueda en `src/modules/<módulo>/`. Ejemplo completo: `src/app/catalogos/grados/page.tsx` y `src/modules/catalogos/grados-listado.ts`.
**Cómo se usa** (resumen del ejemplo de Grados):

```tsx
// src/modules/<módulo>/<listado>-listado.ts: columnas, filtros, búsqueda y orden
export const LISTADO: DefinicionListado = {
  columnas: ["nombre", "division"],          // solo estas se aceptan en `orden`
  ordenInicial: { columna: "nombre", dir: "asc" },
  filtros: { estatus: ["ACTIVO", "BAJA"] },  // valores finitos
};
export const filtro = (c: ConsultaListado) =>
  condicionTexto(c.q, (contiene) => [{ nombre: contiene }, { division: { nombre: contiene } }]);
export const orden = (c: ConsultaListado) =>
  ordenarPor(c, { nombre: (d) => ({ nombre: d }), division: (d) => ({ division: { nombre: d } }) });

// page.tsx
const { consulta, errores } = analizarListado(LISTADO, await searchParams);
const where = { ...filtro(consulta), ...(consulta.filtros.estatus ? { estatus: consulta.filtros.estatus } : {}) };
const total = await prisma.x.count({ where });
const paginacion = paginar(total, consulta);
const filas = await prisma.x.findMany({ where, orderBy: orden(consulta), skip: paginacion.salto, take: paginacion.tamanio });
// <BarraListado …/>, <EncabezadoOrdenable columna="nombre" …>Nombre</EncabezadoOrdenable>, <PaginacionListado …/>
```

- Los filtros de valores finitos van dentro del `where` de cada página (la pieza valida el valor; la página decide qué campo filtra).
- Un parámetro inválido (columna que no existe, página 0, texto repetido) no rompe la pantalla: se ignora, se usa el valor inicial y `BarraListado` muestra el aviso.
- Tras Editar o Eliminar, las acciones redirigen al listado sin el estado de búsqueda; es aceptable porque el mensaje de éxito se muestra arriba.

- **Excepción:** un listado pequeño y acotado por diseño puede omitir alguna regla si se justifica en su issue.

### Altas en modal (D-214)

> **Estado:** acordada (D-214). La pieza `<ModalAlta>` ya existe en `src/components/modal-alta.tsx` (contrato más abajo), pero **ninguna pantalla la usa todavía**: el alta en panel de la plantilla de arriba sigue siendo la válida. No migres una pantalla sin su issue y sin esperar al piloto de Profesores (D-216).

El listado es la pantalla principal de gestión: encabezado con título, descripción, total de registros y la acción principal; debajo, un panel con búsqueda, filtros, tabla y paginación (D-009). El botón «Registrar…» abre el alta en un modal. *Editar* y *Eliminar* no cambian: siguen en la fila con `<FilaEditable>`.

| Momento | Qué hace el modal |
| --- | --- |
| Abrir | Título según la entidad y foco dentro. El formulario siempre se muestra limpio |
| Navegar | Tab y Mayús+Tab no salen del modal. En celular se adapta al espacio, con contenido desplazable y controles alcanzables |
| Cerrar sin guardar | Escape y *Cancelar* cierran si no hay un envío en curso; con cambios sin guardar piden confirmación accesible (nada de `confirm()`). Pulsar el fondo no cierra. Al cerrar, el foco vuelve al botón que lo abrió y no se escribe nada |
| Guardar | Server Action con `useActionState`, permisos (`requireModulo`/`requireRol`) y Zod en el servidor. Mientras se envía, muestra «Guardando…», impide envíos repetidos y no deja cerrar |
| Error | El modal sigue abierto, conserva los valores, marca los campos con `aria-invalid` y muestra el mensaje en español con `<Aviso tipo="error">` |
| Éxito | Solo tras confirmar el guardado en el servidor: cierra, actualiza el listado y muestra un aviso anunciado a tecnologías de asistencia («Profesor registrado correctamente») |

- **Estado del listado:** se conservan búsqueda, filtros, orden y página. Si el registro nuevo no coincide con los filtros o queda en otra página, el aviso dice que se guardó aunque no aparezca en la vista actual.
- **Excepciones:** escaneo, carga de archivos, revisión y generación de reportes conservan su flujo propio y no se convierten en modales. Inicio y acceso tampoco son listados.
- **Fuera de alcance:** este patrón no cambia reglas de negocio, esquema ni permisos. No agrega exportaciones.

#### Contrato de `ModalAlta` (#161)

La pieza está en `src/components/modal-alta.tsx`; su lógica comprobable está en `modal-alta-logica.ts`. Se incorpora por PR separado y no migra las pantallas existentes. El piloto sigue siendo un requisito antes de extender el patrón.

- Se compone desde un **componente cliente**. Recibe `titulo`, `textoBoton`, `descripcion` opcional, una Server Action `accion` y una función hija que dibuja los campos. No pases esa función desde una página servidor.
- La pieza contiene el `<form>`, `useActionState`, Cancelar y Guardar. La función hija no agrega otro formulario. Recibe `estado`, `enviando`, `valor(nombre, inicial)` y `marcarCambios()` para controles propios.
- La acción devuelve `EstadoAlta`: `error`, `campo` y `valores` cuando no se guarda, o `exito` con el mensaje confirmado por el servidor. Un resultado vacío o con error nunca cierra el modal. Los valores múltiples se conservan en `estado.valores` como listas.
- Cada acción del módulo empieza por `requireModulo`/`requireRol`, valida con Zod y actualiza su ruta con `revalidatePath`. No redirige al guardar: devuelve `exito`. El modal llama a `router.refresh()` y conserva la URL completa del listado.
- Usa `valor()` en los valores iniciales de los campos y `aria-invalid` según `estado.campo`. Los errores remontan el formulario con sus valores conservados; cada apertura nueva lo monta limpio. Las cargas de archivos conservan su flujo independiente.
- El diálogo nativo contiene el foco, con control explícito de Tab y Mayús+Tab. Escape respeta el envío y la confirmación de cambios; pulsar el fondo no cierra. Cancelar devuelve el foco al disparador después de desmontar el diálogo.

Prueba aislada reproducible: `node src/components/modal-alta.navegador.mjs`. Usa el Chrome instalado (configurable con `CHROME_BIN`), un perfil temporal y acciones ficticias; no consulta la base ni la sesión de la persona. Comprueba teclado real, cancelación, errores, envío único, éxito y contenido desplazable en claro, oscuro y a 390 píxeles.

### Selector de profesor (D-215)

Para elegir un profesor en un formulario (por ejemplo, integrantes de un cuerpo académico) se usa un selector con búsqueda, no una lista larga.

- Se escribe nombre, apellidos o código y muestra las coincidencias **dentro de las opciones permitidas para esa operación**.
- Se elige con teclado. Sin coincidencias muestra «No se encontraron profesores».
- Buscar no borra la selección existente: solo lo hace una acción explícita.
- El servidor vuelve a validar al profesor y su elegibilidad; ocultar opciones no es seguridad (RNF-005).
- No crea profesores ni cambia su estatus.
- La pieza es compartida (`src/components/`): se acuerda con el equipo antes de tocarla y su lógica pura lleva prueba en `src/modules/`.

#### Contrato de `SelectorProfesor` (#162)

La pieza está en `src/components/selector-profesor.tsx`, con búsqueda y validación del identificador en `src/lib/selectores/profesor.ts` (lógica compartida, no del módulo de Profesores; cada módulo aporta su propia regla de elegibilidad en el callback). Se entrega sin migrar pantallas: la integración corresponde al piloto y a cada módulo.

- Recibe `opciones` autorizadas con `id`, `nombres`, `apellidos` y `codigo`; `nombre` del campo (predeterminado `profesorId`), `etiqueta`, `valorInicial`, `requerido`, `deshabilitado` y `error` son opcionales. Para asociarlo con `ModalAlta`, pasa `deshabilitado={enviando}` y `alSeleccionar={() => marcarCambios()}` desde el componente cliente.
- Es un combobox con listbox. Flechas, Home, End y Enter recorren y eligen opciones; Escape cierra sugerencias antes de llegar al diálogo contenedor. El identificador elegido se envía en un campo oculto; el texto de búsqueda no sustituye esa selección. «Quitar selección» es una acción explícita.
- La búsqueda en las opciones ya autorizadas tolera mayúsculas, acentos, espacios y palabras en distinto orden. No cambia la búsqueda SQL de otros listados ni resuelve D-213.
- Las sugerencias muestran como máximo diez coincidencias. Si hay más, el aviso pide precisar la búsqueda. Es un conjunto efímero de opciones, no un listado de gestión: no lleva paginación, edición o borrado. Esta excepción de D-009 se documenta en #162.
- Si las opciones cambian y el profesor elegido deja de estar permitido, se conserva el identificador y se muestra el aviso; no se borra silenciosamente. El servidor decide si se puede guardar.
- Después de `requireModulo`/`requireRol`, la Server Action puede llamar a `revalidarProfesorSeleccionado(formData.get("profesorId"), buscarElegible)`. Ese callback consulta **de nuevo con Prisma** usando el identificador y las reglas actuales del módulo; devuelve el profesor permitido o `null`. Nunca revalida contra las opciones recibidas del navegador. La función devuelve `{ profesor }` o `{ error }` en español, también ante valores atípicos e incidencias de datos.
- Dentro de `ModalAlta`, tras un error el formulario se monta de nuevo: pasa `valorInicial={Number(valor("profesorId")) || undefined}` para que la selección se conserve.

Prueba aislada: `node src/components/selector-profesor.navegador.mjs`. Usa Chrome con perfil temporal y profesores ficticios; comprueba búsqueda, teclado real, ratón, selección conservada, obligatoriedad y cambio de opciones en claro, oscuro y celular. La revalidación al guardar se prueba aparte con callbacks simulados; cada integración conserva las pruebas de elegibilidad propias del módulo.

## 8. Antes de entregar una pantalla

- [ ] Usa `Marco` (o `PantallaAcceso` si no hay sesión) y piezas de `@/components/ui`.
- [ ] Ningún color suelto: `npm test` pasa, incluida `pauta-visual.test.ts`.
- [ ] Se ve bien en tema claro y en tema oscuro.
- [ ] Vista de celular: columnas apiladas, sin desplazamiento horizontal.
- [ ] Campos dentro de su `<label>`, con `aria-invalid` cuando tienen error.
- [ ] Si es un listado: cada fila tiene *Editar* y *Eliminar* para los roles que registran, y eliminar no deja registros relacionados sin referencia.
- [ ] Si el alta es en modal (D-214, cuando exista `<ModalAlta>`): se completa y cancela solo con teclado, un envío inválido conserva los datos sin cerrar, y no se puede enviar dos veces.
- [ ] Si elige un profesor: usa el selector con búsqueda y el servidor vuelve a validar su elegibilidad.
