# 012_RUTINA_Y_BIBLIOTECA

Estado: Implementado
Prioridad: Alta
Responsable: Agente (sesión Claude Code) con supervisión de elperik
Dependencias: `009_CIERRE_FASE_0`, `010_GRABADOR_SESION_Y_SELECTORES`, `004_MODELO_DE_RUTINAS_Y_EJECUCION`
Última revisión: 2026-06-28

Commit/PR: PR #4 (merge `a533368`)
Verificación: 45 tests Vitest + lint/typecheck/build verdes (local y CI).
Riesgo residual: biblioteca en `storage.local` (no en el host, Fase 4); sin editor de pasos ni versionado con hash todavía (iniciativa 013 y siguientes); sin E2E automatizado.

## 1. Problema

Una grabación produce pasos sueltos en `storage.local`, no una rutina mantenible. Falta convertir esos pasos en una `Routine` validada contra el contrato, guardarla en una biblioteca y poder exportarla/importarla sin secretos. Es el inicio de la Fase 2 (`002 §4`).

## 2. Objetivo

Primer incremento de la Fase 2: transformar la grabación actual en una `Routine` válida (schema `routine.schema.json`), una biblioteca mínima (guardar, listar, eliminar) y exportación/importación que rechace ficheros inválidos o manipulados y nunca incluya secretos.

## 3. Alcance

### Incluido

- conversión grabación → `Routine` (id, nombre, `allowedDomains` derivados de los orígenes grabados, pasos con `risk`/`confirmationRequired` por defecto);
- validación con el validador de contrato existente;
- biblioteca en `storage.local` (guardar, listar, eliminar);
- exportación a JSON sin secretos;
- importación con validación y rechazo de inválidos/manipulados;
- UI mínima en el panel (guardar, lista, exportar, importar);
- pruebas unitarias de la lógica pura (build y export/import).

### Excluido

- editor de pasos (reordenar, editar, agrupar): siguiente slice de Fase 2;
- versionado completo `RoutineVersion` con hash de integridad: siguiente slice;
- variables y expresiones avanzadas;
- persistencia en el host Java (Fase 4);
- reproducción (Fase 3).

## 4. Requisitos funcionales

- RF-001: convertir los pasos grabados en una `Routine` que valide contra el esquema.
- RF-002: `allowedDomains` se deriva de los orígenes de los pasos grabados.
- RF-003: guardar, listar y eliminar rutinas en la biblioteca local.
- RF-004: exportar una rutina a JSON; el JSON no contiene valores de campos sensibles.
- RF-005: importar valida el esquema y rechaza ficheros inválidos, con campos desconocidos o manipulados.

## 5. Requisitos no funcionales

- RNF-001 (seguridad): la exportación no incluye secretos; la importación trata el fichero como no confiable y lo valida antes de guardarlo.
- RNF-002 (mantenibilidad): la conversión y el parseo son funciones puras testeables en Node.
- RNF-003: no se amplían permisos.

## 6. Diseño propuesto

- `extension/src/routines/build.ts` (puro): `buildRoutineFromRecording(name, steps)` → `{ ok, routine } | { ok:false, issues }`, validando con `validateRoutine`.
- `extension/src/routines/io.ts` (puro): `serializeRoutine(routine)` y `parseRoutine(text)` con validación y rechazo estructurado.
- `extension/src/routines/library.ts`: helpers de `storage.local` (clave `rutea.routines`).
- UI: botones de guardar, lista de rutinas con exportar/eliminar e importación por fichero en el panel.

## 7. Pruebas

- [x] `buildRoutineFromRecording`: produce rutina válida; deriva dominios; rechaza grabación vacía y nombre vacío; omite valores redactados (5 casos).
- [x] `parseRoutine`: acepta válido, rechaza JSON inválido, campos desconocidos y esquema incorrecto (4 casos). Total Vitest: 45.
- [ ] verificación manual en Chrome: grabar → guardar → exportar → importar (pendiente del usuario).

## 8. Criterios de aceptación

- CA-001: una grabación se convierte en una rutina que valida contra el esquema.
- CA-002: la biblioteca guarda, lista y elimina rutinas.
- CA-003: una exportación no contiene secretos.
- CA-004: una importación inválida o manipulada se rechaza con motivo.
- CA-005: no se amplían permisos.

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-27: la fuente de verdad de la biblioteca es `storage.local` en esta fase; se trasladará al host Java en la Fase 4. Los pasos por defecto se marcan `risk: low` y `confirmationRequired: false`; la clasificación de riesgo real se abordará con el editor y el ejecutor.

## 15. Resultado implementado

Entregado: conversión grabación → `Routine` validada (`routines/build.ts`), export/import con rechazo de inválidos (`routines/io.ts`), biblioteca en `storage.local` (`routines/library.ts`) y UI de biblioteca en el panel (guardar, listar, exportar, eliminar, importar). 9 pruebas nuevas (45 totales).

Commit/PR: PR #4 (merge `a533368`).
Verificación: local + CI verdes.
Riesgo residual: biblioteca local (no host); sin editor ni versionado con hash; sin E2E automatizado.
