# Issue #282: segunda pasada visual del panel y de las pantallas nuevas (#414, #421, #423)

Fecha: 2026-11-26. Complementa [ISSUE-282-revision-panel-administracion.md](ISSUE-282-revision-panel-administracion.md). La ejecutaron I1 (`@edelpinovs`), que inició sesión como administrador, y un agente de IA que manejó Chrome. Es una lista de comprobación, sin código; no se subieron capturas porque mostraban correos y nombres reales.

## 1. Entorno

| Dato | Valor |
|---|---|
| Código | Copia temporal con `main` (`dd8b402`) más las ramas de los PR #414 (invitar usuarios), #421 (rango Desde/Hasta) y #423 (áreas y subáreas) fusionadas, sin subirlas. Servidor local en `http://localhost:3100` (webpack) |
| Base | La compartida de desarrollo, con ambas migraciones (#414 y #423) ya aplicadas |
| Sesión | Administrador, iniciada por I1; el agente no escribió contraseñas |
| Celular | La ventana de Chrome no se pudo achicar con la extensión; se midió y se vio cada pantalla dentro de un marco de **390 px de ancho** de la misma página (con sus reglas `@media` reales). No es un teléfono real |
| Lo que NO es | Vercel, un teléfono real, ni COORDINADOR en vivo |

## 2. Resultados

| Pantalla | Tema oscuro | Tema claro | Celular (390 px) |
|---|---|---|---|
| `/catalogos/areas` | Correcto | No visto | **Correcto:** sin desplazamiento horizontal; la fila con editar y eliminar cabe |
| `/catalogos/subareas` | Correcto (filtro por área incluido) | No visto | **Correcto:** sin desplazamiento horizontal |
| `/administracion/auditoria` con rango Desde/Hasta | Correcto | Correcto | Los campos de fecha se apilan y funcionan; **la tabla no cabe** (hallazgo 1) |
| `/administracion/usuarios` | No visto en esta pasada | No visto | **La tabla no cabe** (hallazgo 2) |
| Rango inválido (`hasta` anterior a `desde`) | Aviso en español «La fecha final debe ser igual o posterior a la fecha inicial.», el campo «Hasta» con borde de error y vacío | Igual | — |

Sesión y permisos: con la sesión de administrador entraron las cuatro pantallas nuevas. El resto de la lista del #282 (Inicio, Calidad, Escaneo, Estado del sistema, COORDINADOR, Excel y PDF, Vercel) **no se repitió**.

## 3. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Media | **Bitácora en celular:** la tabla mide 683 px dentro de un contenedor de 279 px y todos los contenedores ocultan el desbordamiento, así que las columnas «Acción» y «Detalle» (y parte de «Módulo») no se pueden ver ni desplazar. Incumple la regla de AGENTS.md («columnas que se apilan, sin desplazamiento horizontal»). No lo introduce el #421: la tabla es la misma de antes |
| 2 | Media | **Usuarios en celular:** la tabla mide 543 px en 279 px y la página completa se desplaza en horizontal (579 px de ancho en una vista de 390 px). Mismo origen que el hallazgo 1 |
| 3 | Menor | **Texto del buscador de la bitácora cortado:** «Persona, módulo, acción, texto o fecha (2…» no cabe ni en escritorio; se lee «(2». Conviene acortarlo |
| 4 | Menor | **Datos de prueba en la base compartida:** existe el área «Ciencias de la salud» con la subárea «Genética moulecular» (error de captura), creadas probando el #423. Si no son de demostración, conviene corregir o eliminar la subárea desde la pantalla |
| 5 | Menor | **Tema de la sesión:** la prueba dejó el tema claro en la cookie de I1; se cambia desde el botón del menú |

## 4. Lo que NO se comprobó

- Tema claro de Áreas, Subáreas y Usuarios; el modal «Invitar usuario», el panel «Invitaciones pendientes» y «Cancelar invitación» del #414 (no se abrieron).
- Calidad, Escaneo, Estado del sistema e Inicio en celular y en tema claro (pendiente del registro anterior).
- COORDINADOR en vivo, descarga en Vercel (tamaños y tiempos) y los archivos abiertos en Excel y PDF.
- Un teléfono real.

## 5. Siguiente paso

Los hallazgos 1 y 2 quedaron en el issue #425 (el #282 pide que lo que falle tenga el suyo). El #282 **sigue abierto** por lo que no se comprobó.
