# Issue #161: pieza compartida ModalAlta

Fecha: 2026-11-09. Rama: `feat/M1-RF-UI-modal-alta`.

Los acuerdos D-214 y D-215, la pauta y AGENTS ya se integraron mediante #153, #154 y #155. Esta entrega implementa la pieza compartida, sin adaptar pantallas; el piloto de Profesores conserva su entrega independiente.

## Comprobaciones

| Control | Resultado |
| --- | --- |
| `npm test` | 616 pruebas, 54 archivos; pasan |
| `npm run lint` | Pasa sin advertencias |
| `npm run typecheck` | Pasa |
| `npm run build` | Pasa |
| Chrome aislado, claro y oscuro, 1280 × 900 | Pasa; capturas inspeccionadas |
| Chrome aislado, celular 390 × 844 | Pasa; captura inspeccionada, sin desbordamiento horizontal |

La prueba `node src/components/modal-alta.navegador.mjs` genera los recursos y perfiles en una carpeta temporal y muestra la ubicación de las capturas. Usa esbuild, PostCSS y Tailwind ya instalados; no agrega dependencias. `CHROME_BIN` permite indicar otra instalación de Chrome. El enrutador y la acción están simulados; no se leen ni escriben datos de Supabase y no se usa el perfil del navegador de la persona.

Se comprobaron foco inicial y retorno al disparador, Tab/Mayús+Tab y Escape reales, confirmación de cambios, fondo que no cierra, error con valores conservados y modal abierto, envío bloqueado contra doble envío y cierre, éxito anunciado, conservación de búsqueda/página en la URL y nueva alta limpia. Se insertó contenido ficticio largo para comprobar desplazamiento y que Guardar sea alcanzable.

La prueba detectó y permitió corregir el retorno prematuro del foco mientras el diálogo todavía hacía inerte el fondo. Las pruebas puras cubren cierre durante envío, campos repetidos, error, resultado vacío y resultado contradictorio.

Limitaciones: la prueba del navegador usa una acción ficticia. El piloto deberá probar una Server Action real con permisos, Zod y revalidación; esa responsabilidad permanece en cada módulo. Falta revisión independiente y una comprobación con lector de pantalla.
