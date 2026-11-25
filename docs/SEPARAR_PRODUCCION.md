# Separar producción de desarrollo (issue #42, D-219)

Lista de pasos para quien administra la infraestructura. Complementa [OPERACION.md](OPERACION.md). **Nadie del equipo ejecuta esto salvo quien tiene acceso de propietario a Supabase y Vercel.** Ningún valor secreto se escribe en este documento, en el chat, en issues ni en commits: el repositorio es público.

## Estado de partida

Comprobado el 2026-11-21 con la dirección pública de Supabase que el sitio incrusta en su JavaScript: **producción y la vista previa de un PR usan el mismo proyecto de Supabase, el de desarrollo.** Comparten base, usuarios y datos de demostración. El #42 tiene todas las casillas marcadas sin cumplirse (ver su comentario del 2026-11-10).

Al terminar: producción usa un proyecto propio y limpio; la vista previa y el trabajo local siguen en desarrollo.

## 0. Decide antes de empezar

- [ ] **Plan de Supabase.** Confirma en *Organization › Billing* las condiciones vigentes del plan gratuito: sus proyectos se pausan tras un periodo de inactividad y no incluyen las copias de seguridad ni la restauración de los planes de pago. Para una plataforma en uso real, decide si producción merece un plan de pago o un respaldo propio. El plan gratuito permite 2 proyectos activos y hoy hay 1.
- [ ] **Datos iniciales.** Producción empieza **sin datos semilla**: nada de `db:seed` ni `db:demo`. Grados, divisiones y departamentos se registran desde la interfaz.
- [ ] **Usuarios.** Las cuentas del proyecto de desarrollo **no se migran**: en el proyecto nuevo se crean de cero (pasos 6 y 9).
- [ ] **Política de datos reales.** Por D-259, la base compartida de desarrollo admite datos reales de profesores solo por el flujo de [`IMPORTACION_DATOS_REALES.md`](IMPORTACION_DATOS_REALES.md), como medida provisional. Al separar producción, esos datos deben salir de desarrollo y entrar en producción por el mismo flujo. En producción los habrá de forma permanente: define quién accede, cómo se respalda y quién responde por ellos.
- [ ] **SMTP propio** (opcional): sin él, los correos de Supabase solo llegan a miembros de la organización y con un límite bajo. Los accesos por enlace o contraseña temporal no lo necesitan.

## 1. Prepara la reversa

- [ ] Anota **en tu gestor de contraseñas** (no en un archivo del repositorio) los valores actuales de las variables de *Production* en Vercel. No hace falta si confías en la reversa del paso 10, pero es la forma más rápida de volver.
- [ ] Confirma que eres propietario del proyecto de Vercel y de la organización de Supabase.

## 2. Crea el proyecto de Supabase de producción

- [ ] Crea un proyecto nuevo (por ejemplo `pgpc-produccion`), con una contraseña de base de datos fuerte guardada en tu gestor, y la región más cercana a quienes lo usan (desarrollo usa `us-west-2`).
- [ ] Copia de *Connect* y *Project Settings › API Keys* los valores que irán en el paso 4: dos cadenas de conexión (Transaction pooler, puerto 6543, y Session pooler, puerto 5432), la dirección del proyecto, la llave *publishable* y la llave *secret*.

## 3. Configura Supabase Auth del proyecto nuevo

Cada proyecto acepta solo sus propias direcciones. Como las vistas previas seguirán en desarrollo, **producción no necesita las direcciones de vista previa ni `localhost`**:

- [ ] *Authentication › URL Configuration › Site URL:* `https://plataforma-gest-prod-cientifica.vercel.app`
- [ ] *Redirect URLs:* solo `https://plataforma-gest-prod-cientifica.vercel.app/**`. No uses `https://*.vercel.app/**`.
- [ ] *Authentication › Providers › Email › Email OTP Expiration:* 1 hora, como en desarrollo.
- [ ] *Project Settings › Data API:* **desactivada** (la app no la usa y la llave publishable es pública).
- [ ] No edites las plantillas de correo (Supabase lo exige con SMTP propio).

## 4. Crea `.env.produccion` en tu máquina

- [ ] Crea el archivo `.env.produccion` en la raíz. **Con ese nombre exacto:** git lo ignora (`.env*`) y Next.js no lo carga. **No lo llames `.env.production`**: Next.js lo cargaría en cualquier `npm run build` local.
- [ ] Contenido, con los valores del proyecto **nuevo**: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_CORREO` y `SITIO_URL` (la dirección de producción). Usa `.env.example` como plantilla.
- [ ] Verifica que apunta al proyecto nuevo y **no al de desarrollo**. Este comando imprime solo el servidor, nunca la contraseña:

  ```bash
  node -e "require('dotenv').config({path:'.env.produccion'});console.log(new URL(process.env.DIRECT_URL).hostname)"
  ```

  Compara la referencia que aparece con la del proyecto de desarrollo (en [OPERACION.md](OPERACION.md)): deben ser distintas.

## 5. Aplica las migraciones al proyecto nuevo

`prisma.config.ts` y los scripts leen el entorno con `dotenv/config`, que respeta la variable `DOTENV_CONFIG_PATH`. Así un solo comando apunta a producción sin tocar tu `.env` de desarrollo.

- [ ] PowerShell:

  ```powershell
  $env:DOTENV_CONFIG_PATH = ".env.produccion"; npm run db:migrar; Remove-Item Env:DOTENV_CONFIG_PATH
  ```

  Git Bash: `DOTENV_CONFIG_PATH=.env.produccion npm run db:migrar`

- [ ] La salida debe terminar con que todas las migraciones se aplicaron (hoy son 8, las carpetas de `prisma/migrations`).
- [ ] **No ejecutes** `db:seed`, `db:demo`, `prisma migrate dev`, `migrate reset` ni `db push`.

## 6. Verifica la base de producción

En *SQL Editor* del proyecto **nuevo** (consultas de solo lectura):

- [ ] Migraciones aplicadas: `select count(*) from _prisma_migrations where finished_at is not null;` debe coincidir con el número de carpetas de `prisma/migrations`.
- [ ] RLS: `select tablename from pg_tables where schemaname = 'public' and not rowsecurity order by 1;` debe salir vacía o listar únicamente `_prisma_migrations` (la crea Prisma y la migración `habilitar_rls` no la cubre; con la Data API desactivada no es alcanzable). Cualquier otra tabla que aparezca es un hallazgo.
- [ ] Bucket de resultados: `select id, public from storage.buckets;` debe mostrar `resultados-convocatorias` con `public = false`.
- [ ] Sin datos: `select (select count(*) from "Profesor") as profesores, (select count(*) from "Perfil") as perfiles;` debe dar `0` y `0` (el perfil sube a 1 en el paso 7).

## 7. Crea el primer administrador de producción

- [ ] PowerShell: `$env:DOTENV_CONFIG_PATH = ".env.produccion"; npm run crear-admin; Remove-Item Env:DOTENV_CONFIG_PATH`
- [ ] Guarda la contraseña temporal que imprime, en tu gestor. Al entrar a producción, cámbiala desde *Mi cuenta* (`/cuenta`).
- [ ] `SUPABASE_SECRET_KEY` solo vive en `.env.produccion`: **nunca en Vercel**.

## 8. Cambia las variables de Production en Vercel

En *Settings › Environment Variables* del proyecto:

- [ ] Para `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: deja la entrada actual **solo en Preview y Development** (con los valores de desarrollo) y crea una entrada nueva **solo para Production** con los valores del proyecto nuevo.
- [ ] Revisa las variables del motor de escaneo (`SCOPUS_API_KEY`, `SCOPUS_CLAVE_MAESTRA`, `OPENALEX_API_KEY`, `OPENALEX_EMAIL`, `SERPAPI_API_KEY`, `CROSSREF_MAILTO`) y decide cuáles lleva Production. La clave maestra cifra la configuración de Scopus que se guarda en la base: con la base nueva esa configuración está vacía y se captura de nuevo.
- [ ] **No agregues** `SUPABASE_SECRET_KEY`, `DIRECT_URL` ni `PRODUCCION_DEMO` (esta última es solo para la demostración local de desarrollo).
- [ ] **Vuelve a desplegar producción** (*Deployments › ⋯ › Redeploy*). Cambiar variables no afecta a los despliegues existentes, y las `NEXT_PUBLIC_*` se incrustan al compilar: hace falta una compilación nueva.

## 9. Comprueba la separación

Los criterios son medibles; el #42 se cierra solo cuando todos se cumplen.

- [ ] **La dirección pública de Supabase de producción ya no es la de desarrollo ni la de la vista previa** (Git Bash):

  ```bash
  host_de() { curl -s "$1/login" -o /tmp/l.html; for u in $(grep -o '/_next/static/[^"]*\.js' /tmp/l.html | sort -u); do curl -s "$1$u"; done | grep -o '[a-z0-9]\{20\}\.supabase\.co' | sort -u; }
  host_de https://plataforma-gest-prod-cientifica.vercel.app      # producción
  host_de <dirección de la vista previa de cualquier PR reciente>   # vista previa
  ```

  Deben imprimir dos referencias **distintas**, y la de la vista previa debe ser la de desarrollo.
- [ ] Inicias sesión en producción con el administrador nuevo, y **una cuenta del proyecto de desarrollo ya no entra en producción**.
- [ ] Producción no muestra datos de demostración: el panel de inicio muestra 0 profesores y `DOTENV_CONFIG_PATH=.env.produccion npm run db:demo:contar` da `0` en todo (solo cuenta lo marcado como demostración; no uses `cargar` ni `limpiar`). El conteo total de `Profesor` ya lo comprobaste en el paso 6.
- [ ] La vista previa de un PR sigue entrando con las cuentas de desarrollo y mostrando sus datos.
- [ ] Un enlace de acceso generado con `DOTENV_CONFIG_PATH=.env.produccion npm run invitar -- <correo> <rol>` abre `/auth/confirmar` en producción y permite definir la contraseña (prueba el flujo de punta a punta con una cuenta tuya).

## 10. Si algo falla: reversa

- En Vercel, *Deployments*: promueve o vuelve a desplegar el despliegue de producción anterior. Conserva las variables con las que se compiló, así que la reversa es inmediata y no depende de los valores del paso 1.
- El proyecto nuevo puede quedarse mientras se corrige: no afecta al de desarrollo.

## 11. Cierra la documentación

- [ ] Actualiza [OPERACION.md](OPERACION.md): el proyecto de producción (referencia y región) junto al de desarrollo, y la tabla de variables con la columna de producción.
- [ ] D-219 (`docs/DECISIONES.md`): pasa a su estado vigente con el enlace al cierre, y actualiza el pendiente de Infraestructura de `docs/SEGUIMIENTO.md`.
- [ ] Corrige las casillas del #42 para que reflejen lo cumplido, y que lo cierre una persona.

## Fuera de alcance

Migrar datos de desarrollo a producción, un dominio propio, el SMTP propio y las copias de seguridad automáticas: cada uno necesita su decisión e issue.
