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

## 8. Antes de entregar una pantalla

- [ ] Usa `Marco` (o `PantallaAcceso` si no hay sesión) y piezas de `@/components/ui`.
- [ ] Ningún color suelto: `npm test` pasa, incluida `pauta-visual.test.ts`.
- [ ] Se ve bien en tema claro y en tema oscuro.
- [ ] Vista de celular: columnas apiladas, sin desplazamiento horizontal.
- [ ] Campos dentro de su `<label>`, con `aria-invalid` cuando tienen error.
- [ ] Si es un listado: cada fila tiene *Editar* y *Eliminar* para los roles que registran, y eliminar no deja registros relacionados sin referencia.
