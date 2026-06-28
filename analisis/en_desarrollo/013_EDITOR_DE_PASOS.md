# 013_EDITOR_DE_PASOS

Estado: En desarrollo
Prioridad: Alta
Responsable: Agente (sesión Claude Code) con supervisión de elperik
Dependencias: `012_RUTINA_Y_BIBLIOTECA`, `004_MODELO_DE_RUTINAS_Y_EJECUCION`
Última revisión: 2026-06-28

## 1. Problema

Las rutinas guardadas no se pueden editar: una grabación produce pasos con valores por defecto (`risk: low`, sin confirmación) que a menudo no reflejan la realidad. Falta poder reordenar, eliminar y ajustar pasos antes de ejecutarlos. Es la segunda parte del editor de la Fase 2 (`001 §3.4`).

## 2. Objetivo

Un editor mínimo en el panel para una rutina de la biblioteca: reordenar y eliminar pasos, ajustar `risk`, `confirmationRequired` y `timeoutMs`, renombrar la rutina, y guardar revalidando contra el contrato.

## 3. Alcance

### Incluido

- abrir una rutina de la biblioteca en modo edición;
- reordenar pasos (subir/bajar);
- eliminar un paso;
- editar por paso: `risk`, `confirmationRequired`, `timeoutMs`;
- renombrar la rutina;
- guardar con revalidación contra el esquema;
- operaciones de edición como funciones puras con pruebas.

### Excluido

- convertir valores en variables y expresiones (slice posterior);
- precondiciones/postcondiciones en UI;
- `RoutineVersion` con hash de integridad (slice posterior);
- probar un paso aislado y reemplazo guiado de selectores (requiere ejecutor, Fase 3);
- agrupar pasos y pausas de intervención.

## 4. Requisitos funcionales

- RF-001: seleccionar una rutina de la biblioteca abre su editor.
- RF-002: subir/bajar reordena el paso y persiste el orden tras guardar.
- RF-003: eliminar quita el paso.
- RF-004: editar `risk`/`confirmationRequired`/`timeoutMs` actualiza el paso.
- RF-005: guardar revalida; si la rutina resultante no cumple el esquema, no se guarda y se informa.

## 5. Requisitos no funcionales

- RNF-001 (mantenibilidad): las operaciones de edición son funciones puras inmutables, testeables en Node.
- RNF-002 (seguridad): el guardado revalida contra el contrato; no se amplían permisos.

## 6. Diseño propuesto

- `extension/src/routines/edit.ts` (puro): `moveStep`, `removeStep`, `updateStep`, `renameRoutine`, todas devolviendo una nueva `Routine` sin mutar la entrada.
- UI: sección de edición en el panel que renderiza los pasos de la rutina seleccionada con controles y un botón de guardar que llama a `validateRoutine` antes de `saveRoutine`.

## 7. Pruebas

- [x] `moveStep`: sube/baja, no se sale de rango, inmutable.
- [x] `removeStep`: elimina el índice correcto, ignora fuera de rango.
- [x] `updateStep`: aplica patch parcial; establece y limpia el timeout.
- [x] `renameRoutine`: cambia el nombre, recorta espacios, inmutable.
- [ ] verificación manual en Chrome (pendiente del usuario). Total Vitest: 55.

## 8. Criterios de aceptación

- CA-001: reordenar y guardar conserva el nuevo orden al reabrir.
- CA-002: editar riesgo/confirmación/timeout persiste.
- CA-003: una edición que rompa el esquema no se guarda y se informa.
- CA-004: no se amplían permisos.

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-28: las operaciones de edición se modelan como transformaciones puras de `Routine` para poder probarlas sin DOM y reutilizarlas en un futuro editor más rico.

## 15. Resultado implementado

Completar al mover a `implementado`.

Commit/PR: Pendiente
Verificación: Pendiente
Riesgo residual: Pendiente
