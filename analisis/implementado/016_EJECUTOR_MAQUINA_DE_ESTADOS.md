# 016_EJECUTOR_MAQUINA_DE_ESTADOS

Estado: Implementado
Prioridad: Alta
Responsable: Agente (sesión Claude Code) con supervisión de elperik
Dependencias: `004_MODELO_DE_RUTINAS_Y_EJECUCION`, `015_VARIABLES`
Última revisión: 2026-06-28

Commit/PR: PR #8 (merge `10e2c09`)
Verificación: 80 tests Vitest + lint/typecheck/build verdes (local y CI, incluido host Java).
Riesgo residual: subconjunto de estados (sin context/recovering); sin reintentos/backoff temporales; el player que la consume llega en la 017.

## 1. Problema

No existe ejecutor. El doc 002 (Fase 3) exige diseñar la máquina de estados de ejecución antes de implementar la reproducción, y el doc 004 define los estados, el catálogo cerrado de acciones y las confirmaciones. Sin esta base, un player tocaría el DOM sin control de estado, confirmaciones ni recuperación.

## 2. Objetivo

Implementar, como lógica pura y testeable, la máquina de estados de ejecución de una rutina: estados, eventos, transiciones, catálogo cerrado de acciones, decisión de confirmación por riesgo/política y resultado por paso. No toca el DOM; el player que la consuma llega en el siguiente slice.

## 3. Alcance

### Incluido

- estados de ejecución y transiciones explícitas;
- eventos (iniciar, paso completado, paso fallido, confirmar, cancelar, pausar, reanudar);
- reductor puro `reduce(routine, state, event)`;
- catálogo cerrado de acciones ejecutables y su comprobación;
- decisión de confirmación: `confirmationRequired` o riesgo alto/irreversible;
- resultado por paso (estado, selector usado, error) acumulado;
- pruebas exhaustivas de transiciones y casos límite.

### Excluido

- ejecución real en el DOM (content script player): siguiente slice;
- recuperación con selectores alternativos e IA (fases posteriores);
- reintentos automáticos y backoff (se modela el estado, no la política temporal todavía);
- persistencia del estado de ejecución en el host (Fase 4).

## 4. Requisitos funcionales

- RF-001: una ejecución parte de `created`; al iniciar, una rutina sin pasos termina en `completed`.
- RF-002: antes de un paso que requiere confirmación, el estado pasa a `waiting_for_confirmation` y no avanza sin `confirm`.
- RF-003: un paso completado avanza el índice; al terminar todos, `completed`.
- RF-004: un paso fallido lleva a `failed` y registra el error.
- RF-005: `cancel` desde cualquier estado no terminal lleva a `cancelled`.
- RF-006: una acción fuera del catálogo cerrado no se considera ejecutable.

## 5. Requisitos no funcionales

- RNF-001 (mantenibilidad): el reductor es puro, sin DOM ni temporizadores; las transiciones son explícitas.
- RNF-002 (seguridad): las acciones irreversibles o de riesgo alto exigen confirmación por defecto.
- RNF-003: estados terminales no transicionan.

## 6. Diseño propuesto

- `extension/src/executor/execution.ts` (puro):
  - `ExecutionStatus`, `StepOutcome`, `ExecutionState`, `ExecutionEvent`;
  - `createExecution(routine, mode)`;
  - `reduce(routine, state, event)`;
  - `currentStep`, `isTerminal`, `needsConfirmation`;
  - `EXECUTABLE_ACTIONS` y `isExecutableAction`.
- El player (siguiente slice) emitirá `stepCompleted`/`stepFailed` tras actuar en el DOM y consultará `currentStep`/estado.

## 7. Pruebas

- [x] inicio con rutina vacía → `completed`.
- [x] avance normal de varios pasos → `completed`.
- [x] paso con confirmación → `waiting_for_confirmation`; `confirm` → `running`.
- [x] paso fallido → `failed` con error.
- [x] `cancel` desde no terminal → `cancelled`; terminal estable.
- [x] pausa/reanudación al mismo paso.
- [x] `needsConfirmation` por riesgo y por flag; `isExecutableAction` para el catálogo cerrado.

Total Vitest: 80 (9 nuevos).

## 8. Criterios de aceptación

- CA-001: todas las transiciones definidas están cubiertas por pruebas.
- CA-002: una acción irreversible exige confirmación.
- CA-003: estados terminales son estables.
- CA-004: el módulo no depende del DOM.

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-28: se modela un subconjunto de los estados del doc 004 suficiente para el primer ejecutor (`created`, `running`, `waiting_for_confirmation`, `paused`, `completed`, `failed`, `cancelled`); los estados de contexto/recuperación se incorporarán con el player y la recuperación.

## 15. Resultado implementado

Entregado: `executor/execution.ts` (estados, eventos, reductor puro, confirmación por riesgo/flag, resultado por paso, catálogo cerrado de acciones). 9 pruebas nuevas (80 totales).

Commit/PR: PR #8 (merge `10e2c09`).
Verificación: local + CI verdes.
Riesgo residual: subconjunto de estados; sin reintentos temporales; player pendiente (017).
