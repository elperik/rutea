# 018_PRUEBAS_PLAYER

Estado: En desarrollo
Prioridad: Media
Responsable: Agente (sesión Claude Code) con supervisión de elperik
Dependencias: `017_PLAYER_EJECUCION_SUPERVISADA`, `007_ESTRATEGIA_DE_PRUEBAS`
Última revisión: 2026-06-28

## 1. Problema

La lógica del player que toca el DOM (resolver objetivo, aplicar valores, verificar postcondiciones) solo se ha verificado manualmente. Es la parte más propensa a regresiones y no hay red de seguridad automatizada.

## 2. Objetivo

Cubrir la lógica DOM del player con pruebas de componente sobre un DOM real (happy-dom), ejecutables en CI sin navegador. Aislar el núcleo del player de la mensajería de la extensión para poder probarlo.

## 3. Alcance

### Incluido

- extraer `executeStep` y sus ayudantes a `content/player-core.ts` (sin dependencia de `chrome`);
- dejar `content/player.ts` como adaptador que conecta `chrome.runtime` con el núcleo;
- añadir `happy-dom` y configurar el entorno de test por archivo;
- pruebas de `click`, `fill`, `select`, `check`, `wait` y postcondiciones sobre un DOM real;
- pruebas de objetivo inexistente y de postcondición incumplida.

### Excluido

- E2E completo de la extensión con Playwright (side panel + content scripts): queda como iniciativa posterior por su coste y fragilidad;
- acción `navigate` (no soportada aún por el player).

## 4. Requisitos funcionales

- RF-001: `fill` aplica el valor y dispara `input`/`change`.
- RF-002: `click` invoca el manejador del elemento objetivo.
- RF-003: `check` y `select` actualizan el control y disparan `change`.
- RF-004: un objetivo inexistente devuelve fallo con motivo.
- RF-005: una postcondición se evalúa y un incumplimiento devuelve fallo.

## 5. Requisitos no funcionales

- RNF-001 (mantenibilidad): el núcleo del player no depende de `chrome`; el adaptador es mínimo.
- RNF-002: las pruebas corren en Node con happy-dom, sin navegador, en CI.

## 6. Diseño propuesto

- `content/player-core.ts`: `executeStep(step, value): Promise<Outcome>` operando sobre `document`/`window` globales.
- `content/player.ts`: registra el listener `RUTEA_EXECUTE_STEP` y delega en `executeStep`.
- `vitest.config.ts`: `environmentMatchGlobs` para usar happy-dom solo en los tests del player.

## 7. Pruebas

- [x] `fill` sobre un input establece valor y dispara `input`/`change`.
- [x] `click` ejecuta el handler del objetivo.
- [x] `check`/`select` actualizan el control y disparan `change`.
- [x] objetivo inexistente → fallo; primer selector que casa.
- [x] postcondición `valueEquals` cumplida e incumplida.
- [x] `wait` termina ok.

9 pruebas con happy-dom; total Vitest: 92. La visibilidad de layout (`elementVisible`) no se prueba con happy-dom por su soporte limitado de layout; queda para el E2E.

## 8. Criterios de aceptación

- CA-001: la lógica DOM del player está cubierta por pruebas en CI.
- CA-002: el núcleo del player es independiente de `chrome`.
- CA-003: no cambia el comportamiento del player en Chrome.

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-28: se prefiere happy-dom a un E2E con Playwright para esta verificación por coste y estabilidad; el E2E completo se planifica aparte.

## 15. Resultado implementado

Completar al mover a `implementado`.

Commit/PR: Pendiente
Verificación: Pendiente
Riesgo residual: Pendiente
