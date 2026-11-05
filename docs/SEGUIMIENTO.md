# Seguimiento de revisiones

Una fila por PR revisado, con su dictamen y lo que sigue abierto. Se actualiza al publicar una revisión, al integrarse el PR y cuando se cierra un punto. Las definiciones del equipo están en [`DECISIONES.md`](DECISIONES.md); el detalle de cada prueba, en `docs/pruebas/`.

Dictámenes: **Aprobado**, **Aprobado con comentarios**, **Solicitar cambios**, **Sin revisar**. «Fecha» es la del registro de la revisión; en los más antiguos, la de integración. «Estado» es el del PR en GitHub. Solo se usan nombres de usuario de GitHub y roles (I1 a I8); nunca datos personales.

## Revisiones

| PR | Autor/a | Tema | Dictamen | Abiertos | Registro | Fecha | Estado |
|---|---|---|---|---|---|---|---|
| #49 | layon-king | Panel de resumen del inicio | Aprobado | Verificar con datos reales | [PR-049](pruebas/PR-049-inicio-panel.md) | 2026-10-16 | Integrado |
| #51 | layon-king | Login SIIAU preparado | Aprobado con comentarios | No activar hasta resolver `LOGIN_SIIAU.md` (D-207) | [PR-051](pruebas/PR-051-login-siiau.md) | 2026-10-16 | Integrado |
| #52 | edelpinovs | RF-001 grados científicos | Aprobado | — | [PR-052](pruebas/PR-052-grados-cientificos.md) | 2026-10-16 | Integrado |
| #53 | edelpinovs | RF-002 divisiones | Aprobado con comentarios | — | [PR-053](pruebas/PR-053-divisiones.md) | 2026-10-17 | Integrado |
| #57 | edelpinovs | Pauta visual, marco y tema oscuro | Aprobado con comentarios | Acordar cambios en `AGENTS.md` y `src/components/` (D-002) | [PR-057](pruebas/PR-057-pauta-visual.md) | 2026-10-17 | Integrado |
| #58 | edelpinovs | RF-001 editar y eliminar grados | Aprobado | — | [PR-058](pruebas/PR-058-editar-eliminar-grados.md) | 2026-10-17 | Integrado |
| #61 | edelpinovs | Editar y eliminar en divisiones y departamentos | Solicitar cambios (primera revisión) | Casos sin probar; corregido antes de integrar | [PR-061](pruebas/PR-061-editar-eliminar-catalogos.md) | 2026-10-22 | Integrado |
| #63 | irybyron | RF-020 a RF-022 motor de escaneo | Solicitar cambios (segunda revisión: con avance claro) | El lote del cron no avanza; escaneo de «todos» sin límite; cambio de alcance a acordar; justificar #59 | [PR-063](pruebas/PR-063-motor-escaneo.md) | 2026-11-03 | **Abierto** |
| #65 | marisleidysvazquez8293-arch | RF-012 cuerpos académicos | Aprobado | — | [PR-065](pruebas/PR-065-cuerpos-academicos.md) | 2026-10-22 | Integrado |
| #66 | dpfuentes92 | RF-004 registro de profesores | Solicitar cambios | Sustituido por el #69, que lo incluye | [PR-066](pruebas/PR-066-registro-profesores.md) | 2026-10-29 | Cerrado |
| #69 | dpfuentes92 | RF-005 unicidad de identificadores | Aprobado con comentarios | R1 (campo marcado en carrera); pruebas a `profesores.test.ts`; `Closes`; `vitest.config.mts` | [PR-069](pruebas/PR-069-unicidad-identificadores.md) | 2026-10-30 | Integrado |
| #72 | dpfuentes92 | RF-006 contratación y estatus | Aprobado con comentarios | Reordenar para no repetir el #69; estatus por omisión; vista previa en tres modos | [PR-072](pruebas/PR-072-contratacion-estatus.md) | 2026-10-31 | Integrado |
| #74 | yanetzijimeno8297 | RF-023 a RF-025 validación | Solicitar cambios, luego **Aprobado con comentarios** (seguimiento) | 3 menores: quién confirma lo capturado (D-202); DOI sensible a mayúsculas; `?accion=` con código inexistente | [PR-074](pruebas/PR-074-validacion-produccion.md) | 2026-11-04 | Integrado |
| #77 | Grillo-de-Alambre | RF-016 subida directa a Storage | Aprobado con comentarios | `DELETE` de Storage en la migración; otra persona lee el SQL; hallazgos 2 a 6 en un PR de seguimiento | [PR-077](pruebas/PR-077-subida-resultados-storage.md) | 2026-11-04 | Integrado |
| #79 | Ared11 | RF-007 registro SNII | Solicitar cambios (ligeros) | Aplicados en el #85 | [PR-079](pruebas/PR-079-snii.md) | 2026-11-04 | Integrado |
| #80 | marisleidysvazquez8293-arch | RF-013 integrantes del CA | Solicitar cambios, luego **Aprobado con comentarios** (seguimiento) | 3 menores: editar sin cambio a un integrante no activo (D-203); CA que crece sin PRODEP (D-204); `?editado=`/`?eliminado=` por la URL, `hoyUtc()` y `overflow-x-auto` | [PR-080](pruebas/PR-080-integrantes-ca.md) | 2026-11-05 | Integrado |
| #85 | Ared11 | RF-007 observaciones del #79 | Solicitar cambios | Lockfile ajeno; `Closes #` vacío; traslape por resultado y no por nivel (D-104) | [PR-085](pruebas/PR-085-snii-observaciones.md) | 2026-11-05 | **Abierto** |
| #88 | marisleidysvazquez8293-arch | RF-014 líder único del CA | Solicitar cambios | Escritura del líder sin condicionar a que siga siendo integrante; plantilla del PR; `overflow-x-auto` del listado | [PR-088](pruebas/PR-088-lider-ca.md) | 2026-11-05 | **Abierto** |
| #89 | marisleidysvazquez8293-arch | RF-015 LGAC del CA | Sin revisar | — | — | — | **Abierto** |

Los PR de documentación, reglas e infraestructura de I1 (#1 a #48, #54, #56, #60, #64, #67, #68, #70, #71, #73, #75, #76, #78, #81 a #84, #86, #87 y #90) no se listan aquí.

## Pendientes del grupo

Cosas que no pertenecen a un solo PR.

| Tema | Pendiente | Responsable | Estado |
|---|---|---|---|
| Vigencias | Respaldo en la base contra el traslape de periodos (D-201) | Equipo, con I3 | pendiente |
| PRODEP | Unificar las tres copias de la regla de PRODEP activo (D-205) | I3 | pendiente |
| Datos de demostración | Decidir si se agrega `seed-demo.ts` y dónde se carga (D-206) | Equipo, con quien amplía `seed.ts` | pendiente |
| Reconocimientos | Aplicar en el #85 los cambios pedidos y volver a correr la revisión | Ared11 | en curso |
| Cuerpos académicos | Aplicar en el #88 la escritura condicionada del líder | marisleidysvazquez8293-arch | en curso |
| Autenticación | Evaluar subir la vigencia del código de un solo uso (OTP) de Supabase a 24 horas | I1 | opcional |
| Tablero | Que todo el equipo vea el GitHub Project | I1 | pendiente |
| Acceso | Confirmar el acceso de colaborador de un integrante que aún no lo tiene | I1 | pendiente |
| Redacción | En el #52 la palabra clave de cierre estaba en español («Cierra #6»); desde el #71 la regla es `Closes #n` | I1 | revisar |
