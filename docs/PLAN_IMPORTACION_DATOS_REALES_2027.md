# Plan · Importación de datos reales 2027 y actualización del repo PGPC (con Claude Code)

> Este archivo **no contiene datos personales**, así que puede vivir en `docs/` del repo. El paquete con los datos (`pgpc-datos-reales/`) va **solo** en `datos-reales/pgpc-2027/`, que git ignora.
> Base: repo en el commit `4923991` (PR #351), `AGENTS.md`, D-259 a D-276 y `docs/COMPARACION_DATOS_REALES_2027.md` del paquete.

## 0. Principios que garantizan que nada se rompa

1. **Cero migraciones.** Todo lo que se va a cargar cabe en el esquema actual: `PENDIENTE` ya existe y no se agregan columnas. Así se evitan los riesgos de D-275, donde la base queda por delante de `main`. Si una fase descubre que necesita cambiar el esquema, **se detiene** y se abre un issue aparte.
2. **Sin SQL a mano y sin cargas por la interfaz en lote.** Toda escritura pasa por un script `scripts/importar-*.ts` con `simular` / `aplicar -- --confirmo` / `revertir`, el mismo patrón que `importar-profesores.ts`.
3. **Las mismas reglas que la interfaz.** Los scripts validan con los esquemas Zod y las funciones de `src/modules/` (`registrarProfesor`, `reconocimientoSnii`, `hayTraslape`, `validarContratacionProdep`, `revisarAltaIntegrante`, etc.). Si la pantalla rechazaría un registro, el script también lo rechaza y lo anota.
4. **Nunca sobrescribir trabajo humano.** Solo se llenan campos que estén vacíos, en `PENDIENTE`, o con código `PEND####` o correo `@pendiente.invalid`. Lo que alguien ya editó se reporta como conflicto y no se toca.
5. **Ensayo antes que la base real.** Cada `aplicar` se ensaya primero en una copia local de la base: simular, aplicar, verificar, revertir y volver a aplicar.
6. **Reversible.** Cada `aplicar` escribe una bitácora (`datos-reales/bitacoras/<fase>-<fecha>.json`) con los IDs creados y los valores anteriores, y `revertir` la usa. El respaldo `pg_dump` es el último recurso.
7. **El agente no escribe en la base compartida.** Claude Code programa, prueba y corre `simular`. Los comandos `aplicar`, `revertir` y `db:migrar` los ejecuta **una persona**, y `.claude/settings.local.json` lo hace cumplir (§2).
8. **Producción comparte la base (D-219 sigue pendiente).** Todo lo aplicado se ve de inmediato en el sitio publicado. Cada `aplicar` se anuncia en el chat y se hace en una ventana acordada.

## 1. Mapa de fases

| Fase | Qué | Módulo y dueño | Escribe en la base | Depende de |
|---|---|---|---|---|
| F0 | Preparación: paquete, permisos del agente, respaldo, base de ensayo | I1 | No | — |
| F1 | Decisiones con la Coordinación + PR de documentación | I2 (Scrum) | No | F0 |
| F2 | Divisiones reales de CUValles (si se confirma §3.1) | M1 · I1 | Sí, desde la interfaz (6 departamentos) | F1 |
| F3 | Completar los 122 profesores `PEND` | M2 · I2 | Sí (script) | F1, F2 |
| F4 | Dar de alta a los profesores que faltan | M2 · I2 | Sí (script) | F3 |
| F5 | Reconocimientos SNII | M3 · I3 | Sí (script) | F3, F4 |
| F6 | Reconocimientos PRODEP | M3 · I3 | Sí (script) | F3, F4 |
| F7 | Cuerpos Académicos, integrantes y LGAC | M4 · I4 | Sí (script) | F6 |
| F8 | M5: reconocer los encabezados de los archivos reales | M5 · I5 | No | F0 (en paralelo) |
| F9 | Cierre: verificación integral, documentación y datos demo | I1 + I8 | Opcional (`db:demo:limpiar`) | F3–F7 |

Calendario indicativo, con cierre del curso el 9 de diciembre: F0–F1 del 26 al 27 de noviembre · F2 el 27 de noviembre · F3–F4 del 28 de noviembre al 1 de diciembre · F5–F6 del 2 al 3 de diciembre · F7 el 4 de diciembre · F8 en paralelo · F9 el 5 de diciembre · margen hasta el 9.

## 2. F0 · Preparación (hacerlo una sola vez)

**2.1 Paquete en su lugar**
```bash
git checkout main && git pull && npx prisma generate
mkdir -p datos-reales/pgpc-2027 && unzip pgpc-datos-reales.zip -d datos-reales/pgpc-2027/
git check-ignore -v datos-reales/pgpc-2027/data/seed.json   # debe responder con la regla /datos-reales/
git status --porcelain                                      # no debe aparecer nada de datos-reales
```
Va en una **subcarpeta** para que `leerCsvReales` (que busca CSV en la raíz de `datos-reales/`) no se confunda con los CSV del paquete.

**2.2 Candados para Claude Code.** Copia `claude-settings.local.json` (incluido junto a este plan) a `.claude/settings.local.json`. El `.gitignore` del repo **no** ignora `.claude/`, así que exclúyelo solo en tu copia local, sin tocar el `.gitignore`:
```bash
echo ".claude/settings.local.json" >> .git/info/exclude
git check-ignore -v .claude/settings.local.json   # debe responder con .git/info/exclude
```
Qué hace el archivo:
- Niega leer `.env*` y cualquier comando con `--confirmo`. Por eso **todo `aplicar` y todo `revertir` exige `--confirmo`** (contrato §4).
- Niega `migrate dev`, `reset` y `deploy`, `db push`, `db:migrar`, `db:seed`, `*:revertir`, `importar:limpiar`, `db:demo:limpiar`, `pg_restore`, `git push`, `gh pr merge` y editar o cerrar issues.
- Pide confirmación para cualquier `simular`, `contar`, `npx tsx`, `node`, `pg_dump`, `psql`, `git commit`, `gh pr create` y `gh issue create`.
- Desactiva los modos *Auto* y *Bypass permissions* mientras dure la importación.

Una regla `deny` no detiene un script de Node que escriba por su cuenta. Lo que sí lo detiene es que **el propio script se niega a escribir sin `--confirmo`**, y el agente no puede pasar esa bandera.

**2.3 Línea base** (la ejecuta una persona; guarda la salida en `datos-reales/bitacoras/linea-base.txt`):
```bash
npx prisma migrate status            # «Database schema is up to date»
npm run importar:contar              # esperado: 122 con marca PEND
npm run db:demo:contar
npm run importar:catalogos:simular   # esperado: nada por crear
```

**2.4 Respaldo de la base compartida.** Lo ejecuta una persona y se repite antes de cada `aplicar`. Usa `pg_dump` ≥ la versión del servidor Supabase:
```bash
mkdir -p datos-reales/respaldos
pg_dump "$DIRECT_URL" --schema=public --no-owner --no-privileges -Fc \
  -f datos-reales/respaldos/pgpc-$(date +%Y%m%d-%H%M).dump
```

**2.5 Base de ensayo local**, idéntica a `main` y con los datos actuales. Usa **Supabase CLI**, porque las migraciones del repo usan los esquemas `auth` y `storage` (bucket de convocatorias y políticas) y un Postgres simple fallaría. Requiere Docker. Se crea **fuera del repo**, para no generar una carpeta `supabase/` en el repo, y no agrega dependencias:
```bash
mkdir -p ~/pgpc-ensayo && cd ~/pgpc-ensayo
npx supabase@latest init      # solo la primera vez
npx supabase@latest start     # Postgres local en 127.0.0.1:54322
cd <ruta-del-repo>
ENSAYO="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL=$ENSAYO npx prisma migrate deploy
# Restaura solo datos y omite el historial de migraciones (ya lo creó migrate deploy):
pg_restore -l datos-reales/respaldos/<último>.dump | grep -v "_prisma_migrations" > /tmp/lista-ensayo.txt
pg_restore --data-only --disable-triggers --no-owner -L /tmp/lista-ensayo.txt -d "$ENSAYO" datos-reales/respaldos/<último>.dump
DIRECT_URL=$ENSAYO npm run importar:contar     # debe dar lo mismo que en 2.3
```
La URL de ensayo **no es secreta** (es local, con usuario y clave por defecto de Supabase CLI), así que se escribe literal en los comandos, también en los que lance Claude Code. Las variables escritas en línea ganan sobre `.env` (`dotenv` no sobrescribe), así que **en el ensayo cada comando lleva `DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres` delante**. Para no equivocarse de base, el contrato de §4 exige que cada script imprima a qué host se conecta: `127.0.0.1:54322` es el ensayo; cualquier `*.supabase.com` es la base compartida.

## 3. F1 · Decisiones (sin código)

Antes de programar hay que cerrar con la Coordinación o el equipo los puntos de la tabla. Se registran en `docs/DECISIONES.md` con un PR de documentación (`docs/datos-reales-2027`) que además agrega `docs/COMPARACION_DATOS_REALES_2027.md` (la copia **sin nombres** de `COMPARACION_DATOS_REALES_2027.md`).

| # | Pregunta | Propuesta por defecto si no hay respuesta | Bloquea |
|---|---|---|---|
| P1 | ¿Las divisiones son las de CUValles (Estudios Científicos y Tecnológicos, Estudios Económicos y Sociales, Estudios de la Salud) y no los CU de D-263/D-267? | Usar las del Excel oficial; nueva decisión que reemplaza a D-263/D-267 | F2 |
| P2 | Conversión de género `H→M`, `M→F` | Aplicarla (es un hecho del formato, no una opinión) | F3 |
| P3 | Técnico Académico, Convenio SECIHTI y Coordinador de Área: ¿tiempo completo o asignatura? | Dejarlos en `PENDIENTE` | F3 |
| P4 | «Posdoctorante o investigador por México» y «Reincorporación posdoctoral»: ¿cuentan como `ESTANCIA_POSDOCTORAL`? | No cambiar el estatus | F3 |
| P5 | Cuando el código o el correo choca con otro registro, ¿cuál manda? | Ninguno: se reporta y no se toca | F3 |
| P6 | ¿Se dan de alta los profesores que solo aparecen en PRODEP o en un CA y no tienen código? | Solo los que tienen código UdeG; el resto queda en el informe para el cliente | F4 |
| P7 | SNII: `tipoParticipacion` de los 97 periodos que no participaron en 2026 | Opción A: `RENOVACION` si el nivel no es Candidato y ya tenía un periodo previo, `NUEVO_INGRESO` si no. Opción B: no cargarlos hasta tener el dato. **Elegir una** | F5 |
| P8 | PRODEP: `tipoSolicitud` | Los de 6 años → `RENOVACION`; los de 3 años → **preguntar** (sin respuesta no se cargan) | F6 |
| P9 | ¿Los 3 PRODEP vigentes con nombramiento de asignatura se cargan? | No (la regla del repo lo impide); se reportan | F6 |
| P10 | CA: ¿`anioVencimiento` = año de *Próxima evaluación*? | Sí | F7 |
| P11 | CA: ¿los 15 integrantes sin datos se esperan, o se cargan los CA sin ellos? | Cargar los CA con los integrantes válidos y reportar el resto | F7 |
| P12 | ¿Cuándo se limpian los datos demo? | Después de F9, con una decisión registrada | F9 |

## 4. Contrato común de los scripts de importación (F3 a F7)

Todo script nuevo cumple esto, y el PR que no lo cumpla no se integra:

1. Sigue el estilo de `scripts/importar-profesores.ts`: `import "dotenv/config"`, cliente de `src/generated/prisma` con `PrismaPg` sobre `DIRECT_URL`, código en español.
2. **Al arrancar, imprime el host y la base** (`host:puerto/base`, nunca credenciales) y el comando. `aplicar` y `revertir` se niegan a escribir sin `--confirmo`.
3. Lee el paquete con una función nueva `leerPaquete2027()` en `scripts/lib/datos-reales.ts`. Esa función reutiliza la comprobación `git check-ignore` y se niega a correr si la carpeta no está ignorada.
4. La lógica es **pura** y vive en `scripts/lib/<fase>.ts`: recibe lo que hay en la base y lo que trae el paquete, y devuelve un plan (crear / actualizar / omitir / conflicto, cada uno con su motivo). Tiene pruebas en `scripts/lib/<fase>.test.ts` **solo con datos ficticios**.
5. Valida cada registro con el esquema Zod y las reglas del módulo dueño (`src/modules/...`). No duplica reglas.
6. `simular` no escribe en la base. Imprime **solo conteos** en la terminal y deja el detalle con nombres en `datos-reales/plan-<fase>.md`.
7. `aplicar` corre **en una sola transacción**: entra todo o nada. Guarda la bitácora `datos-reales/bitacoras/<fase>-<fecha>.json`, donde `<fase>` es `completar`, `altas`, `snii`, `prodep` o `cuerpos` (IDs creados y valores anteriores por campo). Los scripts de `datos-reales/kit/` buscan la bitácora más reciente con ese nombre.
8. `revertir <bitacora> --confirmo` deshace solo lo que todavía conserva el valor que puso el script. Si alguien lo cambió después, no lo toca y lo reporta.
9. Es **idempotente**: un segundo `simular` después de `aplicar` da 0 cambios.
10. Nunca usa `TRUNCATE`, `DELETE` sin `WHERE`, `$executeRawUnsafe` ni `upsert` sobre campos que alguien editó.
11. Opcional, recomendado: registra un evento en `Auditoria` por lote, con un resumen que contenga solo conteos y códigos, sin nombres (igual que en la bitácora del panel).
12. Agrega sus comandos a `package.json` como `importar:<fase>:simular|aplicar|revertir` y una sección a `docs/IMPORTACION_DATOS_REALES.md` **sin nombres**.

## 5. Ciclo seguro de cada fase con escritura

```
issue (Terminado cuando…) → rama feat/M<n>-RF-xxx-… → Claude Code en modo plan → código + pruebas ficticias
→ npm test · npm run lint · npm run typecheck · npx prisma validate   (lo mismo que el CI)
→ PR con «Closes #n» → revisión de otro integrante (D-006) → integración por una persona
→ ENSAYO local: simular → aplicar → verificar → revertir → aplicar → simular (=0)
→ respaldo fresco → aviso en el chat + ventana
→ simular en la compartida → revisar datos-reales/plan-<fase>.md → una PERSONA ejecuta aplicar --confirmo
→ verificar (§7) → registrar conteos en IMPORTACION_DATOS_REALES.md, DECISIONES.md y SEGUIMIENTO.md (sin nombres)
```
Si la verificación falla: primero `revertir <bitacora>`. Restaurar el respaldo es el último recurso, porque restaurar la base completa borraría el trabajo que el equipo haya hecho después del respaldo.

## 6. Fases en detalle con el prompt para Claude Code

Cada prompt se pega en Claude Code desde la raíz del repo, en **modo plan** (Shift+Tab) para revisar el plan antes de que edite.

### F2 · Divisiones (M1) · sin script
No hace falta código: son 3 divisiones nuevas y 6 departamentos a reasignar, y todo se hace desde *Catálogos › Divisiones / Departamentos* (Editar). Las 4 divisiones actuales se eliminan al final, cuando la interfaz lo permita, porque no deja borrar una división en uso. Las nomenclaturas `DCCI`, `DCNE`, `DCSH`, `DCEA`, `DCS` y `DCCOM` no cambian. Claude Code solo ayuda a **verificar**:
```text
Lee AGENTS.md. Sin escribir en la base, prepara un script de solo lectura `scripts/verificar-divisiones.ts`
(o un comando npx tsx de una línea, sin agregarlo al repo) que liste las divisiones y la división de cada
departamento, para comparar contra la tabla §3.1 de docs/COMPARACION_DATOS_REALES_2027.md.
No modifiques nada; muéstrame la diferencia.
```

### F3 · Completar profesores existentes (M2)
```text
Lee AGENTS.md, docs/IMPORTACION_DATOS_REALES.md, datos-reales/pgpc-2027/CLAUDE.md y
docs/COMPARACION_DATOS_REALES_2027.md (§3.2 y §4.1). Trabajamos el issue #<n>.
Implementa `scripts/completar-profesores.ts` (simular | aplicar --confirmo | revertir <bitacora> --confirmo) y su lógica
pura en `scripts/lib/completar-profesores.ts` cumpliendo el «Contrato común» del plan
(docs/PLAN_IMPORTACION_DATOS_REALES_2027.md §4). Fuente: datos-reales/pgpc-2027/data/json/profesores.json.
Reglas:
- Cruza a cada Profesor con código PEND#### por nombre normalizado (misma normalización que nombreNormalizado);
  si hay 0 o más de 1 candidato, es conflicto y no se toca.
- Solo llena: codigo (si empieza con PEND), correo (si termina en @pendiente.invalid), genero y
  tipoContratacion (si son PENDIENTE), gradoId, departamentoId y cvu (si están vacíos).
- genero: H→M, M→F (el Excel usa M=mujer; el repo M=Masculino). Prueba obligatoria con datos ficticios.
- tipoContratacion: PROFESOR_INVESTIGADOR|PROFESOR_DOCENTE→TIEMPO_COMPLETO, PROFESOR_ASIGNATURA→ASIGNATURA,
  cualquier otro→queda PENDIENTE.
- Departamento: CCI→DCCI, CNE→DCNE, CSH→DCSH, CEA→DCEA, CS→DCS, CC→DCCOM (busca por nomenclatura).
- Grado: DR./DRA.→nomenclatura DR; MTRO./MTRA./M.C.→MTRO.
- Valida cada actualización con el esquema de src/modules/profesores; si un único (codigo, correo, cvu)
  ya lo tiene otra persona, deja ese campo y anótalo como conflicto.
- No reasignes ORCID/Scopus/Scholar (el repo los excluyó a propósito).
No ejecutes aplicar ni revertir: solo simular contra la base de ensayo (DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres) cuando yo te lo pida.
Al terminar corre npm test, npm run lint y npm run typecheck y muéstrame la salida.
```
**Terminado cuando:** pruebas ficticias de cruce único, de conflicto, de no sobrescribir, del género invertido y de idempotencia; ensayo con `simular` = 0 después de `aplicar`; cifras esperadas en el ensayo (aproximadas): unos 114 códigos, unos 116 géneros y unos 113 contrataciones completadas.

### F4 · Alta de profesores faltantes (M2)
Script hermano `scripts/altas-profesores.ts` (comandos `importar:altas:*`). Solo da de alta a quien tiene **código UdeG real** y no está en la base (P6). Los que no tienen código quedan en el informe. Género, contratación, departamento y grado siguen las reglas de F3. El correo es obligatorio y único: si falta, la persona no se carga. Nombres en formato de nombre propio, como lo hace `cargar-profesores.ts`.
```text
Issue #<n+1>: crea scripts/altas-profesores.ts (importar:altas:simular|aplicar|revertir) para profesores del paquete con
codigo_udg real que no existen en la base (ni por código ni por nombre normalizado). Mismas reglas de F3,
mismo contrato. Quien no tenga codigo_udg o correo no se crea: va a datos-reales/plan-altas.md.
Usa la conversión de nombres a nombre propio de scripts/lib/cargar-profesores.ts (no la dupliques: impórtala).
```

### F5 · SNII (M3)
```text
Lee AGENTS.md y COMPARACION_DATOS_REALES_2027.md §4.3. Issue #<n>. Implementa scripts/importar-snii.ts con el contrato del plan.
Fuente: data/json/reconocimientos_snii.json + profesores.json (cruza por codigo_udg, ya cargado en F3/F4).
- nivel: C→CANDIDATO, I→NIVEL_1, II→NIVEL_2, III→NIVEL_3, E→EMERITO.
- resultado APROBADO; los 4 con resultado_convocatoria=NO_APROBADO se registran con nivel NO_APROBADO
  (D-104) y conservan su periodo anterior aprobado.
- tipoParticipacion según la decisión P7 (constante configurable, con prueba).
- Valida con `reconocimientoSnii` de src/modules/reconocimientos/snii.ts (incluida la regla Candidato+Renovación)
  y `hayTraslape` contra lo que ya exista en la base para ese profesor; si traslapa, omite y reporta.
- convocatoriaId = null (no vienen de una carga confirmada de M5). Si el profesor no tiene cvu y el registro
  lo trae en profesores.json, NO lo escribas aquí (eso es F3): reporta.
Bitácora con los ids creados; revertir borra solo esos ids (deleteMany con where id in [...]).
```

### F6 · PRODEP (M3)
```text
Issue #<n>. scripts/importar-prodep.ts con el contrato del plan. Fuente: reconocimientos_prodep.json.
- Omite los registros sin fecha_inicio/fecha_fin (13) y los de profesores que no sean TIEMPO_COMPLETO
  (usa validarContratacionProdep); repórtalos.
- resultado APROBADO; tipoSolicitud según P8 (6 años→RENOVACION; 3 años→el valor decidido o se omite).
- Valida con el esquema de src/modules/reconocimientos/prodep.ts, incluida la duración de calcularVigenciaProdep:
  si la fecha de fin del Excel no coincide con la que calcula el repo, NO la ajustes: reporta el caso.
- hayTraslapeProdep contra lo existente.
```

### F7 · Cuerpos Académicos (M4)
```text
Issue #<n>. scripts/importar-cuerpos.ts con el contrato del plan. Fuente: cuerpos_academicos.json,
ca_integrantes.json, ca_lgac.json.
- nivel: CAEF→EN_FORMACION, CAEC→EN_CONSOLIDACION, CAC→CONSOLIDADO (usa nivel_vigente_2027).
- anioVencimiento = proxima_evaluacion (P10); departamento por nomenclatura como en F3.
- Valida el CA con `cuerpoAcademico` (src/modules/cuerpos-academicos/cuerpo.ts). Integrantes con
  revisarAltaIntegrante en el orden del Excel (D-108 tiempo completo y activo; D-109 el primero con PRODEP vigente):
  el que no pase se omite y se reporta. Líder solo si quedó como integrante (D-111).
- LGAC: una Lgac por renglón de ca_lgac, sin asignar profesores (el Excel no lo dice).
- Integrantes con estado ALTA/BAJA_SOLICITADA_2026: no se cargan; van al informe (D-252 pendiente).
- Si un CA con esa clave ya existe en la base: no lo modifiques; repórtalo.
```

### F8 · M5: encabezados de los archivos reales (sin escritura en la base)
```text
Issue #<n> (M5). En src/modules/convocatorias/lectura.ts amplía ENCABEZADOS para que reconozca los formatos
reales descritos en COMPARACION_DATOS_REALES_2027.md §3.3: «CODIGO UDEG», «NIVEL SNII», «NIVEL SNII 2026», «RESULTADO»,
«RESULTADO 2026», «RESULTADO EN CONVOCATORIA 2026», «INICIO VIGENCIA», «FIN VIGENCIA», «FIN DE VIGENCIA»
y «APELLIDOS» (como nombre en dos partes). Define qué columna manda cuando un archivo trae nivel anterior
y resultado (debe mandar el resultado). Pruebas en lectura.test.ts con archivos FICTICIOS que imiten esos
encabezados; nunca uses los xlsx de datos-reales/ en pruebas. No cambies el esquema.
```
Para probar a mano en local: subir `datos-reales/pgpc-2027/data/ingesta/*.xlsx` en la pantalla de carga, **contra la base de ensayo**.

## 7. Verificación después de cada `aplicar` (la ejecuta una persona)

1. `simular` de esa fase da **0** cambios (idempotencia).
2. Conteos esperados contra `datos-reales/plan-<fase>.md`, y `npm run importar:contar` (debe bajar en F3).
3. `npx prisma migrate status` sigue diciendo *up to date* (nadie migró).
4. Pantallas en el navegador, en tema claro, tema oscuro y celular: Profesores (sin «Pendiente» donde ya hay dato), SNII y PRODEP (vigencias y semáforo), Cuerpos Académicos (líder e integrantes), Inicio (totales) y Reportes (vigencias, convocatoria, matriz).
5. Cifras de control: total de tiempo completo, SNII vigentes por nivel, PRODEP vigentes y CA por nivel. Deben coincidir con el paquete menos lo omitido en el informe.
6. Registrar en `docs/IMPORTACION_DATOS_REALES.md` una tabla de conteos **sin nombres** y la fecha.

## 8. F9 · Cierre

- PR de documentación: resultado de cada fase en `IMPORTACION_DATOS_REALES.md`, decisiones P1–P12 en `DECISIONES.md`, filas de cada PR en `SEGUIMIENTO.md`.
- Informe para el cliente: unir los `datos-reales/plan-*.md` con todo lo omitido (sin código, sin fechas, conflictos, integrantes rechazados). Se entrega **por otro medio**, nunca por el repo.
- Decidir P12 (`npm run db:demo:limpiar`) y recordar D-219: separar producción antes de la entrega final.
- Borrar la base de ensayo local (`npx supabase stop --no-backup`) y guardar los respaldos fuera del equipo personal si contienen datos reales.

## 9. Lista de lo que el agente NO hace nunca

Leer o imprimir `.env` · `prisma migrate dev/reset` · `db push` · `db:migrar` · `aplicar`, `revertir` o `limpiar` contra la base compartida · SQL a mano · usar datos reales en pruebas, semillas, capturas, issues, PR o commits · `git push` a `main`, `push --force`, `gh pr merge` · cambiar `prisma/schema.prisma` sin un issue acordado · desactivar una prueba o una regla de lint para que pase el CI.
