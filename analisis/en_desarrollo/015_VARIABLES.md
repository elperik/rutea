# 015_VARIABLES

Estado: En desarrollo
Prioridad: Alta
Responsable: Agente (sesión Claude Code) con supervisión de elperik
Dependencias: `012_RUTINA_Y_BIBLIOTECA`, `013_EDITOR_DE_PASOS`, `004_MODELO_DE_RUTINAS_Y_EJECUCION`
Última revisión: 2026-06-28

## 1. Problema

Los valores grabados quedan fijos en cada paso. Para reutilizar una rutina con datos distintos hace falta convertir valores en variables con nombre y resolverlos en ejecución. El doc 004 §8 define variables y referencias `{{nombre}}`, y separa valor fijo, variable y referencia a secreto.

## 2. Objetivo

Permitir convertir el valor de un paso en una variable de la rutina, gestionar las variables (valor por defecto, secreto, eliminar) y disponer de una resolución pura de referencias lista para el ejecutor (Fase 3). Los secretos se referencian, no se resuelven aún (almacén seguro en Fase 4).

## 3. Alcance

### Incluido

- referencia textual `{{nombre}}` y utilidades puras para detectarla y nombrarla;
- `extractVariable`: convierte el valor de un paso en variable (tipo inferido, valor por defecto) y sustituye el valor del paso por la referencia;
- gestión de variables: editar valor por defecto, marcar como secreto, eliminar (con revalidación);
- resolución pura: `resolveInputs` (defaults + entradas) y `resolveStepValue` (sustituye referencia por valor), lista para el ejecutor;
- UI en el editor: botón "convertir en variable" por paso y sección de variables;
- pruebas de la lógica pura.

### Excluido

- expresiones más allá de una referencia simple (sin operadores ni funciones);
- resolución real de secretos (Fase 4, almacén seguro del host);
- conjuntos de entradas múltiples / ejecución repetida (slice posterior);
- ejecución (Fase 3): aquí solo se prepara la resolución.

## 4. Requisitos funcionales

- RF-001: convertir el valor de un paso en variable crea la variable y sustituye el valor por `{{nombre}}`.
- RF-002: el nombre de variable se valida (patrón del esquema) y debe ser único.
- RF-003: se puede editar el valor por defecto, marcar secreto y eliminar una variable.
- RF-004: eliminar una variable referenciada por algún paso se impide o advierte.
- RF-005: `resolveStepValue` sustituye una referencia por el valor de entrada o el valor por defecto; un secreto no se resuelve y se marca pendiente.

## 5. Requisitos no funcionales

- RNF-001 (seguridad): el valor por defecto de una variable secreta no se exporta (se omite); las referencias a secretos nunca contienen el valor real.
- RNF-002 (mantenibilidad): la lógica de variables y resolución es pura y testeable.
- RNF-003: cualquier cambio revalida la rutina contra el contrato.

## 6. Diseño propuesto

- `extension/src/routines/variables.ts` (puro): `referenceToken`, `isReference`, `referenceName`, `extractVariable`, `removeVariable`, `updateVariableDefault`, `setVariableSecret`, `resolveInputs`, `resolveStepValue`.
- UI editor: por paso con valor no-referencia, botón para convertir en variable; sección de variables con valor por defecto editable, casilla de secreto y eliminar.

## 7. Pruebas

- [x] `isReference`/`referenceName`: detecta `{{nombre}}` y extrae el nombre.
- [x] `extractVariable`: crea variable con tipo y default, sustituye el valor, valida nombre y unicidad.
- [x] `resolveInputs`/`resolveStepValue`: usa entrada, cae al default, excluye secretos y deja referencias sin valor como pendientes.
- [x] `removeVariable`: impide eliminar una variable referenciada; `setVariableSecret` descarta el default.
- [ ] verificación manual en Chrome (pendiente del usuario). Total Vitest: 71.

## 8. Criterios de aceptación

- CA-001: convertir un valor en variable y guardar produce una rutina válida con la referencia.
- CA-002: la resolución sustituye referencias por entradas o defaults.
- CA-003: el default de una variable secreta no aparece en la exportación.
- CA-004: no se amplían permisos.

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-28: una referencia es exactamente `{{nombre}}` (cadena completa); no se admiten interpolaciones parciales ni expresiones en este slice, para mantener la resolución simple y segura.

## 15. Resultado implementado

Completar al mover a `implementado`.

Commit/PR: Pendiente
Verificación: Pendiente
Riesgo residual: Pendiente
