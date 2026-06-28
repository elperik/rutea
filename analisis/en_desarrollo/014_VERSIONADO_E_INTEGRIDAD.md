# 014_VERSIONADO_E_INTEGRIDAD

Estado: En desarrollo
Prioridad: Alta
Responsable: Agente (sesión Claude Code) con supervisión de elperik
Dependencias: `012_RUTINA_Y_BIBLIOTECA`, `004_MODELO_DE_RUTINAS_Y_EJECUCION`, `005_SEGURIDAD_PRIVACIDAD_Y_PERMISOS`
Última revisión: 2026-06-28

## 1. Problema

La exportación actual es la rutina en crudo, sin metadatos ni integridad. El doc 004 pide un contenido versionado con hash de integridad y el doc 005 pide verificar hash al compartir y tratar las importaciones como no confiables. Hoy una manipulación solo se detecta si rompe el esquema.

## 2. Objetivo

Definir un sobre de exportación con integridad (`SHA-256`) y verificarlo al importar, de modo que cualquier modificación del contenido de la rutina invalide la importación. Mantener la compatibilidad con la importación de una rutina en crudo (sin integridad), marcándola como no verificada.

## 3. Alcance

### Incluido

- contrato `routine-export.schema.json`: sobre con `schemaVersion`, `exportedAt`, `integrity { algorithm, hash }` y `routine`;
- canonicalización determinista de la rutina y hash `SHA-256`;
- exportación que produce el sobre con hash;
- importación que valida el sobre, valida la rutina y verifica el hash;
- importación de rutina en crudo aún aceptada (sin verificación de integridad);
- pruebas de canonicalización, hash, build y verify.

### Excluido

- firma criptográfica con clave (más allá del hash);
- historial de versiones múltiple por rutina (se aborda con la persistencia del host, Fase 4);
- variables y expresiones (slice posterior).

## 4. Requisitos funcionales

- RF-001: exportar produce un sobre con `integrity.hash` = SHA-256 de la rutina canonicalizada.
- RF-002: importar un sobre válido cuyo hash coincide acepta la rutina.
- RF-003: importar un sobre cuyo hash no coincide se rechaza como manipulado.
- RF-004: importar una rutina en crudo válida se acepta marcándola como no verificada.
- RF-005: la canonicalización es estable (orden de claves) para que el hash sea reproducible.

## 5. Requisitos no funcionales

- RNF-001 (seguridad): la verificación de integridad es la primera defensa ante manipulación; la validación de esquema sigue aplicándose.
- RNF-002 (mantenibilidad): canonicalización y hash en un módulo propio; `crypto.subtle` como dependencia de plataforma.
- RNF-003: el contrato es la fuente de verdad (se generan tipos y validador).

## 6. Diseño propuesto

- `shared/contracts/routine-export.schema.json` (nuevo) → tipos y validador generados.
- `extension/src/routines/version.ts`: `canonicalRoutine(routine)` (JSON con claves ordenadas), `hashRoutine(routine)` (SHA-256 hex), `buildExport(routine)` y `verifyExport(envelope)`.
- `extension/src/routines/io.ts`: `serializeRoutineExport(routine)` (async) y `parseRoutineDocument(text)` (async) que distingue sobre vs rutina cruda, valida y verifica.
- UI: exportar e importar pasan a ser asíncronos con el nuevo formato.

## 7. Pruebas

- [x] `canonicalRoutine`: estable ante distinto orden de claves de entrada.
- [x] `hashRoutine`: hex de 64; cambia si cambia el contenido.
- [x] `buildExport`/`verifyExport`: round-trip verificable; manipular la rutina invalida.
- [x] `parseRoutineDocument`: acepta sobre válido (verificado), rechaza hash manipulado, acepta rutina cruda (no verificada), rechaza JSON inválido y campos desconocidos.

Total Vitest: 61 (6 nuevos en `version` e `io`).

## 8. Criterios de aceptación

- CA-001: una exportación incluye un hash de integridad reproducible.
- CA-002: alterar la rutina dentro del sobre hace que la importación la rechace.
- CA-003: una rutina cruda válida sigue importándose (marcada no verificada).
- CA-004: no se amplían permisos.

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-28: el sobre referencia la rutina como objeto y se valida aparte con `validateRoutine`, evitando `$ref` entre ficheros de esquema en la generación de tipos.

## 15. Resultado implementado

Completar al mover a `implementado`.

Commit/PR: Pendiente
Verificación: Pendiente
Riesgo residual: Pendiente
