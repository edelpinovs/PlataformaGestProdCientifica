# PlataformaGestProdCientifica

Plataforma web para gestionar la producción científica y los reconocimientos (SNII, PRODEP, Cuerpos Académicos) del profesorado investigador de CUValles, según el documento de diseño **PGPC-SDD-V4-2026**.

- **Sitio en producción:** https://plataforma-gest-prod-cientifica.vercel.app
- **Plan de trabajo:** [docs/PLAN_DE_TRABAJO.md](docs/PLAN_DE_TRABAJO.md) · [versión interactiva](https://claude.ai/artifact/X4SdM8WyxKD8gzkio8tTUW)
- **Tareas:** [Issues](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues), un issue por requisito (RF) con la etiqueta de su módulo.

## Equipo

<table>
  <tr>
    <td align="center" width="140">
      <a href="https://github.com/edelpinovs"><img src="https://github.com/edelpinovs.png?size=120" width="72" alt="edelpinovs"><br><b>Edel</b></a><br>
      <sub>@edelpinovs</sub><br>
      <sub>M1 Catálogos · líder técnico y DevOps</sub>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/dpfuentes92"><img src="https://github.com/dpfuentes92.png?size=120" width="72" alt="dpfuentes92"><br><b>dpfuentes92</b></a><br>
      <sub>@dpfuentes92</sub><br>
      <sub>M2 Profesores · Scrum master</sub>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/Ared11"><img src="https://github.com/Ared11.png?size=120" width="72" alt="Ared11"><br><b>Ared11</b></a><br>
      <sub>@Ared11</sub><br>
      <sub>M3 SNII/PRODEP · reglas de vigencia</sub>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/marisleidysvazquez8293-arch"><img src="https://github.com/marisleidysvazquez8293-arch.png?size=120" width="72" alt="marisleidysvazquez8293-arch"><br><b>marisleidysvazquez8293</b></a><br>
      <sub>@marisleidysvazquez8293-arch</sub><br>
      <sub>M4 Cuerpos Académicos · QA</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="140">
      <a href="https://github.com/Grillo-de-Alambre"><img src="https://github.com/Grillo-de-Alambre.png?size=120" width="72" alt="Grillo-de-Alambre"><br><b>Alan Ramírez</b></a><br>
      <sub>@Grillo-de-Alambre</sub><br>
      <sub>M5 Convocatorias · segundo plano</sub>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/irybyron"><img src="https://github.com/irybyron.png?size=120" width="72" alt="irybyron"><br><b>irybyron</b></a><br>
      <sub>@irybyron</sub><br>
      <sub>M6 Motor de escaneo · integraciones</sub>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/yanetzijimeno8297"><img src="https://github.com/yanetzijimeno8297.png?size=120" width="72" alt="yanetzijimeno8297"><br><b>yanetzijimeno8297</b></a><br>
      <sub>@yanetzijimeno8297</sub><br>
      <sub>M6 Validación · UX/UI</sub>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/leonelmartinez8296-LMP"><img src="https://github.com/leonelmartinez8296-LMP.png?size=120" width="72" alt="leonelmartinez8296-LMP"><br><b>leonelmartinez8296</b></a><br>
      <sub>@leonelmartinez8296-LMP</sub><br>
      <sub>M7 Reportes · exportación</sub>
    </td>
  </tr>
</table>

Cada integrante trabaja los issues que tiene asignados, uno por requisito (ver [Issues](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues) y `src/modules/registry.ts`).

## Reparto del trabajo

Cada integrante es dueño de uno o más módulos del SDD y de un rol transversal. Los issues están asignados en GitHub, uno por requisito (RF), con el hito de la liberación que le toca. Detalle y razones en el [plan de trabajo](docs/PLAN_DE_TRABAJO.md#2-equipo-y-responsabilidades).

| Rol | Integrante | Módulo (issues) | Rol transversal | Libera |
|---|---|---|---|---|
| I1 | @edelpinovs | M1 Catálogos: RF-001 a 003 (#6 a #8) | Líder técnico y DevOps: CI, Vercel, Supabase, autenticación y roles. Apoya M7 desde el 6 oct | 5 oct |
| I2 | @dpfuentes92 | M2 Profesores: RF-004 a 006 (#9 a #11) | Scrum master: tablero, minutas y dudas del SDD con la Coordinación. Apoya M5 desde el 6 oct | 5 oct |
| I3 | @Ared11 | M3 SNII/PRODEP: RF-007 a 011 (#12 a #16) | Reglas de vigencia (`vigencia_actual()`, `tiene_prodep_activo()`) | 26 oct |
| I4 | @marisleidysvazquez8293-arch | M4 Cuerpos Académicos: RF-012 a 015 (#17 a #20) | QA: datos semilla y pruebas end-to-end | 26 oct |
| I5 | @Grillo-de-Alambre | M5 Convocatorias: RF-016 a 019 (#21 a #24) | Trabajos en segundo plano (tabla `jobs`, cron) | 9 nov |
| I6 | @irybyron | M6 Motor de escaneo: RF-020 a 022 (#25 a #27) | Integraciones externas, llaves de APIs y deduplicación | 23 nov |
| I7 | @yanetzijimeno8297 | M6 Validación: RF-023 a 025 (#28 a #30) | UX/UI: componentes compartidos y regla de 3 clics | 23 nov |
| I8 | @leonelmartinez8296-LMP | M7 Vigencias y reportes: RF-026 a 030 (#31 a #35) | Exportación Excel/PDF y documentación de usuario | 30 nov |

Los issues transversales también tienen dueño: modelo de datos (#3) con I1, huecos del SDD (#5) con I2, y accesos y Supabase de producción (#41, #42) con I1.

### Entregas entre módulos

Lo que un integrante le debe a otro. Si una fecha se mueve, se avisa en la reunión semanal.

| Entrega | De | Para | Fecha |
|---|---|---|---|
| Catálogos consultables | I1 | I2, I4, I8 | 30 sep |
| Kit de UI (plantilla, tablas, formularios) | I7 | Todos | 2 oct |
| Datos semilla ficticios | I4 | Todos | 2 oct |
| Búsqueda de profesor por código, CVU y nombre | I2 | I5, I6 | 5 oct |
| `vigencia_actual()` y `tiene_prodep_activo()` | I3 | I4, I5, I8 | 12 oct |
| Ejecutor de tareas asíncronas con avance | I5 | I6 | 19 oct |
| Servicio de exportación .xlsx / PDF | I8 | I5, I7 | 19 oct |
| Modelos `Publicacion` y `Autoria` | I6 | I7, I8 | 26 oct |

### Fechas clave

| Hito | Fecha | Incluye |
|---|---|---|
| Liberación 1 | 5 oct | M1 y M2 |
| Liberación 2 | 26 oct | M3 y M4 |
| Liberación 3 | 9 nov | M5 |
| Liberación 4 | 23 nov | M6 |
| Liberación 5 | 30 nov | M7 |
| Integración final | 9 dic | Pruebas, manual y despliegue |

### Si hay que cambiar un reparto

Reasigna el issue en GitHub (columna derecha, **Assignees**) y avisa en el chat. Si cambia el dueño de un módulo completo, actualiza también `integrante` en `src/modules/registry.ts` y la tabla de arriba, en un pull request.

## Primeros pasos

Necesitas **Git**, **Node.js 24** y un editor (recomendado VS Code).

1. **Clona el repositorio** en una carpeta que **no** esté sincronizada con Google Drive, OneDrive o Dropbox, por ejemplo `C:\dev`. Esos servicios se atoran con las miles de dependencias de `node_modules`.

   ```bash
   git clone https://github.com/edelpinovs/PlataformaGestProdCientifica.git
   cd PlataformaGestProdCientifica
   npm install
   ```

2. **Pide el archivo `.env` a Edel** por mensaje privado y guárdalo en la raíz del proyecto. Tiene las llaves de la base de datos de desarrollo: nunca lo subas ni lo compartas en el chat del grupo.

3. **Arranca la aplicación:**

   ```bash
   npm run dev
   ```

   Abre http://localhost:3000.

4. **Entra con tu cuenta.** Edel te envía un enlace de invitación. Ábrelo, define tu contraseña y listo: con ese correo y contraseña entras tanto en tu máquina como en el sitio de producción. El enlace sirve una sola vez y caduca en 1 hora; si caduca, pide otro.

## Cómo trabajamos

Cada cambio entra por **pull request**. Nadie sube directo a `main`.

1. **Toma tu issue** y actualiza tu copia:
   ```bash
   git checkout main
   git pull
   npm install        # por si alguien agregó dependencias
   npm run db:migrar  # por si alguien cambió la base de datos
   ```
2. **Crea una rama** con el módulo y el requisito:
   ```bash
   git checkout -b feat/M3-RF-008-candidato
   ```
3. **Programa** en las carpetas de tu módulo (ver tabla abajo) y **prueba**:
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```
4. **Haz commit** mencionando el requisito y sube la rama:
   ```bash
   git commit -m "RF-008: impide renovar a un Candidato en el mismo nivel"
   git push -u origin feat/M3-RF-008-candidato
   ```
5. **Abre el pull request** en GitHub. Escribe `Cierra #<número del issue>` en la descripción para que el issue se cierre solo al integrarlo.
6. **Revisión.** GitHub ejecuta las pruebas (CI) y Vercel publica una **vista previa** con tu cambio, cuyo enlace aparece en el PR. Otro integrante lo revisa y lo aprueba. Con el CI en verde y la aprobación, se integra a `main` y se publica en producción.

Revisa también los PR de tus compañeros: cada PR necesita una aprobación.

## Dónde va cada cosa

| Carpeta | Contenido |
|---|---|
| `src/app/<módulo>/` | Pantallas del módulo (Next.js App Router) |
| `src/modules/<módulo>/` | Reglas de negocio, servicios y validaciones (Zod) del módulo, con sus pruebas |
| `src/modules/registry.ts` | Módulos con su integrante, requisitos, roles con acceso y fecha de liberación |
| `src/components/` | Componentes compartidos de la interfaz |
| `src/lib/` | Conexión a la base (Prisma), sesión y roles. Cámbialo solo si tu tarea lo pide |
| `prisma/schema.prisma` | Modelo de datos de todo el equipo |
| `prisma/migrations/` | Historial de cambios a la base de datos |

Para proteger una pantalla por rol usa `requireModulo("<módulo>")` o `requireRol([...])` de `src/lib/auth/session.ts`.

## Base de datos

Todo el equipo usa **la misma base de desarrollo**, así que un cambio en ella afecta a todos.

**Para cambiar el modelo de datos:**

1. Avisa en el chat del equipo qué vas a cambiar, para no pisarte con alguien más.
2. Actualiza tu copia (`git pull` y `npm run db:migrar`).
3. Edita `prisma/schema.prisma`.
4. Crea la migración:
   ```bash
   npm run db:nueva-migracion -- agrega_cvu_a_profesor
   ```
   Genera el SQL en `prisma/migrations/` y activa la protección RLS en cada tabla nueva. Revisa el archivo antes de seguir.
5. Aplícala a la base con `npm run db:migrar` y súbela en tu PR junto con el cambio a `schema.prisma`.

> **No uses** `npx prisma migrate dev` ni `npx prisma migrate reset`: con una base compartida pueden proponer **borrarla completa**.

Para ver y editar datos: `npx prisma studio`. Usa solo datos ficticios; nunca datos reales de profesores.

## Pruebas

Las pruebas usan **Vitest** y viven junto al código, con el sufijo `.test.ts`. Hay un ejemplo en `src/modules/reportes/semaforo.test.ts`. Cada regla de negocio de tu módulo (validaciones, cálculos de vigencia, deduplicación) debe tener su prueba.

```bash
npm test               # todas las pruebas
npx vitest semaforo    # solo las que coinciden con el nombre
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca la aplicación en http://localhost:3000 |
| `npm test` | Ejecuta las pruebas |
| `npm run lint` · `npm run typecheck` | Revisa estilo y tipos (lo mismo que el CI) |
| `npm run db:migrar` | Aplica a la base las migraciones que falten |
| `npm run db:nueva-migracion -- <nombre>` | Crea una migración a partir de tus cambios en `schema.prisma` |
| `npx prisma studio` | Explora la base de datos en el navegador |

## Stack

Next.js 16 (App Router, TypeScript) · Prisma 7 · PostgreSQL y Auth de Supabase · Tailwind CSS · Vitest · Vercel. El detalle está en la [sección 4 del plan](docs/PLAN_DE_TRABAJO.md#4-arquitectura-recomendada). La configuración de infraestructura y accesos está en [docs/OPERACION.md](docs/OPERACION.md).
