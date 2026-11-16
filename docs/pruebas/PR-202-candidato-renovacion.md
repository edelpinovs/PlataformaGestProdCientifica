# Revisión del PR #202: un Candidato no puede renovar en el mismo nivel (RF-008)

Registro de la revisión del [PR #202](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/202) de `Ared11` (rama `feat/M3-RF-008-candidato`, referencia al issue #13). El comentario está publicado en el PR.

## 1. Alcance revisado

Una regla nueva en `reconocimientoSnii` (`src/modules/reconocimientos/snii.ts`): el nivel Candidato con tipo de participación Renovación se rechaza con «El nivel Candidato no admite renovación.», en el campo `tipoParticipacion`. Alta y edición pasan por el mismo esquema y por `validar()` de `src/app/reconocimientos/snii/actions.ts`. Tres archivos: la regla y las pruebas de módulo y de acciones.

## 2. Chequeos

En copia local de la rama: `npm test` (778 pruebas), `npm run lint` y `npm run typecheck` pasan. Si se quita la regla, fallan 4 de las pruebas nuevas, así que detectan el defecto. El CI (`verificar`) y Vercel pasaron y la rama no tiene conflicto con `main`. Los datos de demostración (`scripts/lib/datos-demo.ts`) no generan ningún Candidato con renovación.

No se ejecutó `npm run build` y la pantalla no se vio en el navegador (el PR no cambia la pantalla).

## 3. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | El issue #13 y el plan §8 punto 6 dejan la regla «pendiente de precisar con la Coordinación»; el PR implementa una interpretación y no queda en `docs/DECISIONES.md` (se registra como D-225, pendiente) | A corregir (bitácora) |
| 2 | La descripción usa `Refs #13` y `AGENTS.md` pide `Closes #13`; con `Refs` el issue queda abierto al integrar | Menor |
| 3 | En `snii.test.ts`, `it.each(["alta", "edición"])` no usa el parámetro y corre dos veces la misma prueba | Menor |
| 4 | La descripción dice que cambia el formulario y solo se tocan pruebas y el esquema; marca la revisión visual sin cambio de pantalla | Menor |

## 4. Dictamen

**Aprobable con comentarios.** El código no tiene defectos; lo pendiente es de bitácora y de la descripción. La aprobación en GitHub la da otra persona del equipo.
