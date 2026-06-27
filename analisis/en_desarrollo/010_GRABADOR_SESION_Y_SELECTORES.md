# 010_GRABADOR_SESION_Y_SELECTORES

Estado: En desarrollo
Prioridad: Alta
Responsable: Agente (sesión Claude Code) con supervisión de elperik
Dependencias: `009_CIERRE_FASE_0`, `001_PROPUESTA_FUNCIONAL_TECNICA`, `004_MODELO_DE_RUTINAS_Y_EJECUCION`
Última revisión: 2026-06-27

## 1. Problema

El grabador actual mantiene el estado de grabación en una variable del content script, que se pierde al recargar o reiniciarse el service worker. Además genera selectores sin puntuación ni explicación y no deduplica eventos. Son carencias de la Fase 1 (`002 §3`).

## 2. Objetivo

Primer incremento de la Fase 1: una sesión de grabación persistente y resiliente a reinicios, deduplicación de eventos, selectores múltiples puntuados y explicados, y redacción de campos sensibles. Sin ampliar permisos de Chrome.

## 3. Alcance

### Incluido

- modelo de sesión de grabación por pestaña en `chrome.storage.session`;
- recuperación del estado al reinyectar el grabador o reiniciar el panel/service worker;
- permiso de host **por sitio** solicitado en runtime al iniciar grabación (`optional_host_permissions` + `chrome.permissions.request` acotado al origen activo);
- deduplicación de pasos consecutivos equivalentes;
- normalización de acciones;
- ranking de selectores con razón (`rationale`) por candidato;
- redacción de valores sensibles (password y campos marcados);
- resaltado breve del elemento capturado;
- registro de desarrollo del host (`register-chrome-host-dev.ps1`) para probar Native Messaging sin jpackage;
- pruebas unitarias de la lógica pura (ranking, dedup, normalización).

### Excluido

- continuidad de grabación **entre navegaciones** y reinyección automática tras cambio de documento: requiere decidir el modelo de permisos por sitio (doc 005) y se aborda en una iniciativa posterior;
- iframes y shadow DOM cerrados;
- editor y reproductor (Fases 2 y 3);
- E2E de navegador (diferido).

## 4. Requisitos funcionales

- RF-001: al iniciar grabación se crea una sesión por `tabId` persistida en `storage.session`.
- RF-002: un grabador reinyectado en la misma página lee la sesión y continúa grabando sin intervención.
- RF-003: dos eventos equivalentes consecutivos (misma acción, objetivo y valor) no producen dos pasos.
- RF-004: cada selector generado incluye una explicación de por qué se eligió y una calidad relativa.
- RF-005: nunca se almacena el valor de un campo `password` ni de un campo marcado como sensible.

## 5. Requisitos no funcionales

- RNF-001 (seguridad): permiso de host mínimo y **por sitio**. No se conceden `host_permissions` de instalación; se usan `optional_host_permissions` solicitados en runtime solo para el origen de la pestaña activa al iniciar grabación. Se añade el permiso `tabs` para conocer ese origen y acotar la petición.
- RNF-002 (mantenibilidad): la lógica pura (ranking, dedup, normalización) vive en módulos sin dependencias de DOM, testeables en Node.
- RNF-003 (rendimiento): el grabador no debe degradar perceptiblemente la página; el resaltado es breve y no bloqueante.

## 6. Diseño propuesto

- `extension/src/content/selectors.ts`: `collectSignals(element)` (DOM) → señales; `rankSelectors(signals)` (puro) → lista ordenada `{ selector, quality, rationale }`.
- `extension/src/content/steps.ts`: `normalizeAction(...)` y `isDuplicate(previous, candidate)` (puros).
- `extension/src/content/session.ts` o lógica en el service worker: estado `{ tabId: { active, startedAt } }` en `storage.session`.
- `recorder.ts` consume los módulos anteriores (esbuild los empaqueta en el IIFE) y aplica redacción y resaltado.

## 7. Pruebas

- [x] `rankSelectors`: prioridad id > data-testid > name > estructural; rationale presente; estabilidad determinista (7 casos).
- [x] `appendStep`/`isEquivalent`: detecta equivalentes, colapsa escrituras sucesivas, no muta (6 casos).
- [~] redacción: cubierta en `recorder.ts` (password, marcados, autocomplete); verificación en navegador diferida con el resto del E2E.

Total Vitest tras el slice: 31 pruebas verdes (local).

## 8. Criterios de aceptación

- CA-001: reiniciar el panel o el service worker no pierde la sesión de grabación en la misma página.
- CA-002: una secuencia con repeticiones no genera pasos duplicados.
- CA-003: cada selector incluye explicación y calidad.
- CA-004: no se registra ningún valor de contraseña.
- CA-005: no se amplían permisos de Chrome.

## 9. Decisiones pendientes

- modelo de permisos por sitio para la continuidad entre navegaciones (iniciativa siguiente).

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-27: se separa la lógica pura del DOM para poder testearla en Node con Vitest sin entorno de navegador.
- 2026-06-27: abrir el panel lateral no concede `activeTab` sobre la página, así que `scripting.executeScript` fallaba ("must request permission to access the respective host"). Decisión: pedir permiso de host **por sitio** en runtime con `optional_host_permissions` + `chrome.permissions.request` durante el gesto de "Iniciar". Para conocer el origen activo y acotar la petición se añade el permiso `tabs`. El origen se cachea para no perder el gesto en un `await` previo a la petición. Verificado en vivo en Chrome.
- 2026-06-27: registro del host en desarrollo mediante `java -jar` y un lanzador generado en `target/` (no se versiona ninguna ruta local). Negociación `hello` verificada end-to-end contra el JAR (respuesta `ok`, contrato `native-response`).

## 15. Resultado implementado

Completar al mover a `implementado`.

Commit/PR: Pendiente
Verificación: Pendiente
Riesgo residual: Pendiente
