# Plan de trabajo · Plataforma de Gestión de la Producción Científica

Propuesta de ejecución basada en el documento **PGPC-SDD-V4-2026** (versión 4.0, 6 sep 2026) para un equipo de 8 integrantes.

| Dato | Valor |
|---|---|
| Fecha de la propuesta | 28 sep 2026 (fin de la semana 3 de 14) |
| Días a la integración | 72 (9 dic 2026) |
| Alcance | 30 RF · 5 RNF · 15 CU |
| Primera liberación | M1 y M2, 5 oct |
| Stack | Next.js + Supabase, desplegado en Vercel desde GitHub |

Las fechas de liberación son las de la sección 6 del SDD. El reparto transversal, la arquitectura y la secuencia de sprints son propuesta y se pueden ajustar en la reunión del equipo.

---

## 1. Qué cambia respecto al plan del SDD

El reparto de la sección 5.1 es correcto en lo funcional, pero deja trabajo sin dueño y la carga desbalanceada: Catálogos (3 RF de CRUD) pesa mucho menos que Reportes (5 RF que dependen de todo lo demás), y nadie tiene asignada la autenticación, la infraestructura o las pruebas.

1. **Cada integrante tiene además un rol transversal.** Autenticación y RBAC, infraestructura, UI compartida, trabajos en segundo plano, QA y exportación tienen dueño desde el día uno.
2. **Los riesgos externos se atacan antes.** El SDD arranca el Motor de Escaneo en la semana 8. Se propone una prueba técnica de las APIs en las semanas 4 a 6, porque conseguir llaves de Scopus puede tardar semanas.
3. **Reportes empieza en la semana 6.** El semáforo de vigencias solo necesita fechas de FIN. Con datos semilla y contratos acordados, el Integrante 8 no espera a que terminen los módulos 3 y 4.
4. **Cada sprint termina en una liberación.** Sprints de duración variable que cierran en las fechas de la sección 6 del SDD, con demo al cierre.

---

## 2. Equipo y responsabilidades

| Integrante | Módulo | Rol transversal | Entrega a otros | Libera |
|---|---|---|---|---|
| **I1** | M1 Catálogos (RF-001–003) | Líder técnico y DevOps: repositorio, CI, proyectos de Vercel y Supabase, autenticación y RBAC (RNF-005). Después del 5 oct apoya a M7 e integración. | Catálogos + catálogo de Programas Educativos; login con roles Administrador / Coordinador / Docente. | 5 oct |
| **I2** | M2 Profesores (RF-004–006) | Scrum master: tablero, minutas, seguimiento de fechas y cierre de dudas del SDD con la Coordinación. | Modelo `Profesor`, búsqueda por código/CVU/nombre normalizado y carga inicial del directorio desde Excel. | 5 oct |
| **I3** | M3 SNII / PRODEP (RF-007–011) | Dueño de reglas de negocio de vigencias: cálculo de periodos, solapes, estados de reconsideración. | Servicios `vigencia_actual()` y `tiene_prodep_activo()` para M4, M5 y M7. | 26 oct |
| **I4** | M4 Cuerpos Académicos (RF-012–015) | Líder de QA: estrategia de pruebas, datos semilla ficticios, pruebas end-to-end de la semana 13. | Script `prisma/seed.ts` (≈60 profesores, 3 divisiones, 6 departamentos). | 26 oct |
| **I5** | M5 Ingesta de convocatorias (RF-016–019) | Trabajos en segundo plano (RNF-001): tabla `jobs`, procesamiento por lotes, Vercel Cron y avance visible. | Ejecutor de tareas asíncronas que reutiliza M6. | 9 nov |
| **I6** | M6 Motor de escaneo (RF-020–022) | Integraciones externas: conectores, llaves, rate limiting (RNF-002) y deduplicación (RNF-004). | Modelos `Publicacion` / `Autoria` y servicio de deduplicación por DOI y título. | 23 nov |
| **I7** | M6 Ingesta manual y validación (RF-023–025) | UX/UI: plantilla base, componentes shadcn/ui compartidos, responsivo y regla de 3 clics (RNF-003). | Kit de UI listo el 2 oct; bandeja de validación. | 23 nov |
| **I8** | M7 Vigencias y reportes (RF-026–030) | Servicio común de exportación Excel/PDF y documentación de usuario. | Exportador reutilizable; semáforo y reportes de Rectoría y acreditación. | 30 nov |

A partir del 6 de octubre, **I1 apoya Reportes** e **I2 apoya Ingesta de convocatorias**, que son los módulos con más dependencias.

---

## 3. Cronograma

Semanas del SDD (inician en martes). `▓` desarrollo · `░` preparación o prueba técnica · `◆` liberación funcional.

```
                          S1  S2  S3  S4  S5  S6  S7  S8  S9  S10 S11 S12 S13 S14
                          8s  15s 22s 29s 6o  13o 20o 27o 3n  10n 17n 24n 1d  8d 
                                     ▲ hoy
Sprint                    [  S0 ] [  S1 ] [    S2   ] [  S3 ] [  S4 ] [S5][  S6 ]
Transversal (I1,I5,I7)            ▓▓▓▓▓▓▓▓▓▓▓
M1 Catálogos (I1)                 ▓▓▓▓▓▓▓◆
M2 Profesores (I2)                ▓▓▓▓▓▓▓◆
M3 SNII/PRODEP (I3)                   ░░░ ▓▓▓▓▓▓▓▓▓▓▓◆
M4 Cuerpos Acad. (I4)                 ░░░ ▓▓▓▓▓▓▓▓▓▓▓◆
M5 Convocatorias (I5+I2)              ░░░░░░░ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓◆
M6 Escaneo/Valid. (I6,I7)             ░░░░░░░░░░░ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓◆
M7 Reportes (I8+I1)                   ░░░░░░░ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓◆
Integración y QA                                                  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓◆
```

| Sprint | Fechas | Objetivo verificable en la demo |
|---|---|---|
| Sprint 0 | 8–21 sep | Modelo de datos y arquitectura. **Si no quedó cerrado, se cierra el martes 29 sep**; es lo único que bloquea a todos. |
| Sprint 1 | 22 sep–5 oct | Login con 3 roles, catálogos y directorio de profesores con datos semilla. Kit de UI en uso. Llave de ORCID activa y solicitud de Scopus enviada. |
| Sprint 2 | 6–26 oct | Registro SNII y PRODEP con todas sus reglas; CA con líder único y LGAC. Parser de Excel leyendo un archivo real. Semáforo calculado sobre datos semilla. |
| Sprint 3 | 27 oct–9 nov | Carga de un listado SNII real, previsualización del balance y confirmación masiva. Conector ORCID con deduplicación por DOI. |
| Sprint 4 | 10–23 nov | Escaneo incremental en segundo plano; bandeja de validación con Confirmar / Rechazar / Editar; captura manual. |
| Sprint 5 | 24–30 nov | Reporte de Convocatoria Anual, Matriz de Acreditación y Reporte de Producción exportables a .xlsx y PDF. Congelamiento de funcionalidades. |
| Sprint 6 | 1–9 dic | Pruebas end-to-end, verificación de los 5 RNF, corrección de errores, manual de usuario y despliegue final. |

---

## 4. Arquitectura recomendada

Un solo proyecto Next.js con frontend y backend, desplegado en Vercel desde GitHub, con Supabase como base de datos, autenticación y almacenamiento de archivos. Cada módulo del SDD tiene su carpeta, así que las fronteras del código coinciden con el reparto.

| Capa | Elección | Motivo |
|---|---|---|
| Frontend y backend | Next.js (App Router) + TypeScript | Pantallas y lógica de servidor (Server Actions y rutas `/api`) en un solo repositorio y un solo despliegue. |
| Hosting | Vercel (plan Hobby) | Cada PR genera una URL de vista previa; `main` se despliega a producción automáticamente. |
| Base de datos | Supabase (PostgreSQL) con `pg_trgm` | Plan gratuito. Unicidad de DOI y código de profesor en la BD (RNF-004); similitud de títulos con `similarity()` (RF-021). |
| Acceso a datos | Prisma | `prisma/schema.prisma` es el modelo de datos compartido del equipo, con migraciones versionadas en Git. |
| Autenticación y roles | Supabase Auth + tabla `perfiles` con el rol | Roles Administrador, Coordinador y Docente validados en el middleware de Next.js (RNF-005). |
| Archivos | Supabase Storage | Listados oficiales cargados (RF-016) y evidencias de la captura manual (CU-012). |
| Interfaz | Tailwind + shadcn/ui, TanStack Table, Recharts | Formularios, tablas con filtros y gráficas de reportes listas para usar. |
| Validación | Zod | Las mismas reglas en formulario y servidor. |
| Excel | ExcelJS | Lectura de listados oficiales (RF-017) y exportación .xlsx (RF-030). |
| PDF | unpdf (lectura), @react-pdf/renderer (generación) | Ninguna necesita un navegador en el servidor; funcionan en Vercel. |
| Deduplicación | DOI normalizado + `pg_trgm` | Coincidencia exacta de DOI primero; luego similitud de título ≥ 0.90 con revisión humana. |
| Fuentes externas | ORCID, Scopus, OpenAlex | Google Scholar no tiene API oficial (ver riesgos). |
| Segundo plano | Tabla `jobs` en Postgres + Vercel Cron | Ver abajo. Inngest queda como opción si los lotes se complican. |
| Pruebas y CI | Vitest, Playwright, GitHub Actions | Lint, tipos y pruebas en cada PR. |

**Trabajos en segundo plano (RNF-001).** Las funciones de Vercel tienen un tiempo máximo por ejecución, así que el trabajo pesado se parte en lotes. Un Excel de unos cientos de filas se procesa en una sola llamada. El escaneo de APIs (RF-020) se registra en la tabla `jobs`; cada llamada procesa un lote (por ejemplo, 20 profesores) y guarda su avance. Un cron diario de Vercel lanza el escaneo incremental y el botón "Escanear ahora" dispara los lotes desde la interfaz mostrando el progreso.

**Semáforo de vigencias (RF-026).** Una vista de Postgres calcula verde, amarillo o rojo a partir de la fecha de FIN en cada consulta; no requiere proceso aparte.

**Entornos.** Dos proyectos de Supabase: *desarrollo* (lo usan las vistas previas de Vercel y el trabajo local, con datos ficticios) y *producción*. Para trabajar localmente basta Node y un `.env.local` con las llaves de desarrollo; no hace falta Docker.

```
prisma/
├── schema.prisma             # modelo de datos compartido (todos, revisa I1)
└── seed.ts                   # I4  datos semilla ficticios
src/
├── app/
│   ├── login/                # I1
│   ├── catalogos/            # I1  divisiones, departamentos, grados, programas educativos
│   ├── profesores/           # I2
│   ├── reconocimientos/      # I3  snii, prodep
│   ├── cuerpos-academicos/   # I4  ca, integrantes, lgac
│   ├── convocatorias/        # I5  convocatoria, participación, ingesta, conciliación
│   ├── produccion/           # I6  escaneo y deduplicación
│   ├── validacion/           # I7  bandeja, captura manual, exclusiones
│   ├── reportes/             # I8  semáforo, reportes, exportación
│   └── api/cron/             # I5 · I6  procesamiento por lotes
├── modules/<módulo>/         # reglas de negocio, servicios y esquemas Zod de cada módulo
├── components/ui/            # I7  componentes compartidos
└── lib/                      # I1  prisma, supabase, auth y roles
```

---

## 5. Contratos entre módulos

Lo que un integrante le debe a otro y para cuándo. Si una fecha se mueve, se avisa en la reunión semanal.

| Entrega | De | Para | Fecha |
|---|---|---|---|
| Modelo de datos v1 y migraciones iniciales | I1 + todos | Todos | 29 sep |
| Catálogos consultables (divisiones, departamentos, grados) | I1 | I2, I4, I8 | 30 sep |
| Plantilla base y componentes de tabla/formulario | I7 | Todos | 2 oct |
| Datos semilla ficticios | I4 | Todos | 2 oct |
| Búsqueda de profesor por código, CVU y nombre | I2 | I5, I6 | 5 oct |
| `vigencia_actual()`, `tiene_prodep_activo()` | I3 | I4, I5, I8 | 12 oct |
| Ejecutor de tareas asíncronas con estado de avance | I5 | I6 | 19 oct |
| Servicio de exportación .xlsx / PDF | I8 | I5, I7 | 19 oct |
| Modelos `Publicacion` y `Autoria` con estados | I6 | I7, I8 | 26 oct |

---

## 6. Forma de trabajo

**Ritmo**
- **Lunes, 30 min:** planeación semanal y revisión de contratos.
- **Diario, asíncrono:** en el chat del equipo, qué hice, qué haré, qué me bloquea.
- **Cierre de sprint:** demo de 10 min por módulo sobre la URL de producción de Vercel.
- **Tablero:** GitHub Projects; un issue por RF o historia, con etiqueta de módulo.

**Código**
- Rama por issue: `feat/M3-RF-008-candidato`. Nadie sube directo a `main`.
- Pull request con al menos una aprobación, de preferencia de alguien de otro módulo.
- Mensajes de commit con el RF: `RF-011: rechaza periodos PRODEP solapados`.
- CI corre pruebas y linter en cada PR; si falla, no se integra.
- Cada PR tiene su URL de vista previa en Vercel; quien revisa prueba el cambio ahí sin instalar nada.
- Llaves de APIs y de Supabase solo en variables de entorno de Vercel y en `.env.local`, nunca en el repositorio (RNF-002).

**Un RF está terminado cuando**
- Cumple la redacción del RF y el flujo del CU correspondiente.
- Cada regla de negocio tiene prueba automatizada (p. ej. RF-008, RF-011, RF-013, RF-014, RF-021).
- Respeta permisos por rol y funciona en pantalla de celular.
- Está integrado en `main`, desplegado en Vercel y mostrado en demo.

---

## 7. Riesgos principales

| Riesgo | Nivel | Mitigación | Dueño |
|---|---|---|---|
| La API de Scopus requiere llave institucional de Elsevier; puede tardar o no concederse. | Alto | Pedirla esta semana vía Biblioteca UdeG. Usar OpenAlex como fuente abierta alternativa con el mismo conector. | I6 |
| Google Scholar no tiene API oficial y bloquea el scraping. | Alto | Tratarlo como fuente opcional (SerpAPI o importación de BibTeX exportado por el docente). Acordarlo con quien evalúa. | I6 |
| Los listados oficiales del SNII no traen el Código CUValles; RF-017 asume que sí. | Alto | Cruzar por CVU primero y por nombre normalizado después; los casos dudosos se resuelven a mano en la previsualización (RF-019). | I5 |
| El formato de los PDF de resultados cambia de un año a otro. | Medio | Conseguir archivos reales 2024–2026. Excel como formato principal; PDF con plantillas de extracción por convocatoria. | I5 |
| M7 depende de todo y se libera 9 días antes del cierre. | Medio | Empieza en semana 6 con datos semilla y contratos; I1 se suma tras el 5 oct. | I8, I1 |
| Ya estamos en la semana 3; el Sprint 0 pudo no haberse cerrado. | Medio | Cerrar el modelo de datos el 29 sep aunque sea imperfecto; los cambios posteriores van por migración revisada. | I1, I2 |
| Las funciones de Vercel tienen tiempo máximo por ejecución y el plan Hobby solo permite crons diarios. | Medio | Procesar en lotes con avance guardado en `jobs`. Si hace falta más frecuencia, un workflow programado de GitHub Actions llama a la ruta. | I5, I6 |
| Supabase gratuito pausa el proyecto tras 7 días sin uso. | Bajo | Uso diario durante el semestre; reactivar desde el panel antes de cada demo y de la entrega. | I1 |
| Si el repositorio se hace privado, Vercel Hobby deja de desplegar commits de integrantes que no son dueños de la cuenta. | Bajo | Mantenerlo público, o pasar a Vercel Pro si se decide cerrarlo. | I1 |
| Datos personales reales en entornos de desarrollo. | Medio | Solo datos ficticios hasta producción. Nada de listados reales de profesores en el repositorio. | I4 |

---

## 8. Huecos del SDD que hay que cerrar

Sin respuesta a estos puntos, los módulos 4, 5 y 7 no pueden terminarse como están escritos. Responsable de llevarlos a la Coordinación: **I2**.

1. **¿Quién es "participante" de una convocatoria?** RF-018 marca como No Aprobado a quien participó y no aparece en la lista, pero el SDD no modela la participación. Propuesta: entidades `Convocatoria` y `Participacion`, con carga previa de los postulantes.
2. **Programa Educativo no existe en los catálogos.** RF-029 filtra por él. Propuesta: agregarlo a M1 con relación muchos a muchos con profesores.
3. **"Proyectos activos" en la Matriz de Acreditación** (CU-015 b) no tiene módulo ni RF. Propuesta: dejarlo fuera de alcance o como campo de texto libre.
4. **Captura manual: ¿validada o pendiente?** RF-023 no lo dice; CU-012 la da por validada de inmediato. Decidir si una captura hecha por el administrador requiere confirmación del docente.
5. **Umbral del semáforo amarillo.** CU-014 dice "próximo a vencer / año de convocatoria". Propuesta: amarillo si vence en 12 meses o menos, rojo si ya venció.
6. **Regla del Candidato (RF-008) y "renovaciones consolidadas sucesivas" (RF-010).** Falta definir cuántas renovaciones dan derecho a 6 años y qué pasa cuando un Candidato no asciende.
7. **Unicidad por título (RNF-004).** La base de datos solo puede garantizar unicidad exacta del título normalizado; la similitud se resuelve en la aplicación con revisión humana. Conviene reescribir el RNF así.
8. **Detalles de redacción:** CONAHCYT ahora es SECIHTI y las etiquetas de la interfaz deberían reflejarlo; en el historial de cambios, las descripciones de las versiones 1.0 y 2.0 parecen invertidas.

---

## 9. Esta semana · 28 sep a 5 oct

- [ ] **lun 28** · Aprobar este reparto de roles y crear el tablero con un issue por RF. — I2
- [ ] **lun 28** · Solicitar llave de Scopus y registrar la aplicación en ORCID. — I6
- [ ] **mar 29** · Cerrar `prisma/schema.prisma` v1 y subir la migración inicial. — I1 + todos
- [ ] **mar 29** · Conseguir listados reales de resultados SNII y PRODEP (2024–2026). — I5
- [ ] **mié 30** · Conectar el repo a Vercel, crear los proyectos de Supabase y compartir `.env.local` de desarrollo con los 8. — I1
- [ ] **jue 1** · Enviar a la Coordinación las 8 preguntas del SDD. — I2
- [ ] **vie 2** · Kit de UI y datos semilla disponibles en `main`. — I7 · I4
- [ ] **lun 5** · Demo de liberación de M1 y M2 con login por roles. — I1 · I2
