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
      <sub>Coordinación y DevOps</sub>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/dpfuentes92"><img src="https://github.com/dpfuentes92.png?size=120" width="72" alt="dpfuentes92"><br><b>dpfuentes92</b></a><br>
      <sub>@dpfuentes92</sub><br>
      <sub>Módulo por asignar</sub>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/Ared11"><img src="https://github.com/Ared11.png?size=120" width="72" alt="Ared11"><br><b>Ared11</b></a><br>
      <sub>@Ared11</sub><br>
      <sub>Módulo por asignar</sub>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/marisleidysvazquez8293-arch"><img src="https://github.com/marisleidysvazquez8293-arch.png?size=120" width="72" alt="marisleidysvazquez8293-arch"><br><b>marisleidysvazquez8293</b></a><br>
      <sub>@marisleidysvazquez8293-arch</sub><br>
      <sub>Módulo por asignar</sub>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/Grillo-de-Alambre"><img src="https://github.com/Grillo-de-Alambre.png?size=120" width="72" alt="Grillo-de-Alambre"><br><b>Alan Ramírez</b></a><br>
      <sub>@Grillo-de-Alambre</sub><br>
      <sub>Módulo por asignar</sub>
    </td>
  </tr>
</table>

Cada integrante trabaja el módulo que tiene asignado (ver issues y `src/modules/registry.ts`).

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
