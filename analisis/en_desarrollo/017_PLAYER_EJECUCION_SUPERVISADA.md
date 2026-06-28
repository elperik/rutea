# 017_PLAYER_EJECUCION_SUPERVISADA

Estado: En desarrollo
Prioridad: Alta
Responsable: Agente (sesión Claude Code) con supervisión de elperik
Dependencias: `016_EJECUTOR_MAQUINA_DE_ESTADOS`, `015_VARIABLES`, `011_CONTINUIDAD_ENTRE_NAVEGACIONES`, `005_SEGURIDAD_PRIVACIDAD_Y_PERMISOS`
Última revisión: 2026-06-28

## 1. Problema

Existe la máquina de estados pero ninguna rutina se ejecuta. Falta un player que actúe en el DOM y un bucle de orquestación que lo conduzca con confirmaciones y postcondiciones.

## 2. Objetivo

Reproducir una rutina sobre el origen autorizado en modo supervisado: el panel conduce la máquina de estados, el player ejecuta cada acción en el DOM, se confirman los pasos sensibles, se verifican postcondiciones y se muestra el progreso y el resultado.

## 3. Alcance

### Incluido

- player en content script: acciones `click`, `fill`, `select`, `check`, `wait`, `assert`;
- resolución del objetivo por selectores ordenados (primer match) y del valor por variables (`resolveStepValue`);
- verificación de postcondición cuando el paso la declara;
- bucle de orquestación en el panel guiado por `reduce`;
- restricción por dominio: solo se ejecuta si el origen activo pertenece a `allowedDomains` y hay permiso de host;
- confirmación explícita antes de pasos sensibles;
- progreso por paso y resumen final en la UI;
- botón "Ejecutar" por rutina.

### Excluido

- acción `navigate` y continuidad entre documentos durante la ejecución (siguiente slice);
- reintentos automáticos, backoff y recuperación con selectores alternativos/IA;
- resolución real de secretos (host, Fase 4);
- ejecución sobre Playwright (Fase 6);
- conjuntos de entrada múltiples.

## 4. Requisitos funcionales

- RF-001: ejecutar una rutina solo si el origen activo está en `allowedDomains` y se concede permiso de host.
- RF-002: cada paso resuelve su objetivo por el primer selector que casa; si ninguno casa, el paso falla.
- RF-003: `fill`/`select`/`check` aplican el valor resuelto y disparan los eventos DOM correspondientes.
- RF-004: un paso sensible no se ejecuta sin confirmación del usuario.
- RF-005: si el paso declara postcondición y no se cumple, el paso falla con motivo.
- RF-006: la ejecución muestra estado y resultado por paso, y un resumen final.

## 5. Requisitos no funcionales

- RNF-001 (seguridad): el player solo actúa en el origen autorizado; las acciones sensibles requieren confirmación; no se inyectan valores de secretos (quedan pendientes).
- RNF-002 (mantenibilidad): la selección de objetivo se apoya en un helper puro testeable; la orquestación reutiliza la máquina de estados.
- RNF-003: el player no escribe valores sensibles en logs.

## 6. Diseño propuesto

- `extension/src/executor/target.ts` (puro): `pickSelector(selectors, test)` devuelve el primer selector que satisface el test (inyectable, testeable en Node).
- `extension/src/content/player.ts` (IIFE): escucha `RUTEA_EXECUTE_STEP`, ejecuta la acción y la postcondición sobre el DOM y responde `{ ok, selectorUsed, error }`.
- `service-worker`: comando `EXECUTE_STEP` que inyecta el player y reenvía a la pestaña activa.
- `main.ts`: botón "Ejecutar"; valida dominio, pide permiso, crea la ejecución y avanza con `reduce`, pidiendo confirmación y mostrando progreso.
- `build.mjs`: nuevo entrypoint IIFE para el player.

## 7. Pruebas

- [x] `pickSelector`: primer match, ninguno, lista vacía (3 casos; 83 totales).
- [ ] verificación manual en Chrome sobre los fixtures (pendiente del usuario): rutina de clics y rellenos, con confirmación y postcondición.

Nota: el player toca el DOM y la mensajería extensión↔content; su verificación es manual en Chrome (el E2E automatizado con Playwright queda diferido). La lógica orquestadora (máquina de estados) y la selección de objetivo sí están cubiertas por unitarias.

## 8. Criterios de aceptación

- CA-001: una rutina de bajo riesgo se reproduce de principio a fin sobre los fixtures.
- CA-002: un paso sensible pide confirmación antes de actuar.
- CA-003: una postcondición incumplida detiene la ejecución con motivo.
- CA-004: ejecutar fuera de `allowedDomains` se rechaza.
- CA-005: no se ejecuta sin permiso de host del origen.

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-28: la orquestación (máquina de estados) vive en el panel; el player solo ejecuta un paso y responde. Así el estado de ejecución es inspeccionable y la parte que toca el DOM queda mínima.

## 15. Resultado implementado

Completar al mover a `implementado`.

Commit/PR: Pendiente
Verificación: Pendiente
Riesgo residual: Pendiente
