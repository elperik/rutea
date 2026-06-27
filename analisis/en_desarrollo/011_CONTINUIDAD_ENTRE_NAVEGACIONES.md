# 011_CONTINUIDAD_ENTRE_NAVEGACIONES

Estado: En desarrollo
Prioridad: Alta
Responsable: Agente (sesión Claude Code) con supervisión de elperik
Dependencias: `010_GRABADOR_SESION_Y_SELECTORES`
Última revisión: 2026-06-27

## 1. Problema

El grabador se inyecta una sola vez con `executeScript`. Tras una navegación de documento completa o una recarga, el content script desaparece y la grabación se interrumpe aunque la sesión siga activa. Es el cuarto criterio de salida de la Fase 1 (`002 §3`).

## 2. Objetivo

Mantener la grabación al navegar o recargar dentro del **origen ya autorizado**, reinyectando el grabador automáticamente, sin ampliar permisos más allá del origen concedido en la 010.

## 3. Alcance

### Incluido

- registro dinámico de un content script acotado al origen autorizado mientras dura la grabación (`chrome.scripting.registerContentScripts`);
- reinyección automática del grabador en cada documento de ese origen;
- reanudación basada en la sesión existente (`RUTEA_IS_RECORDING`);
- desregistro al detener la grabación cuando ningún otro tab del mismo origen sigue grabando;
- módulo puro para el patrón de coincidencia y el id del content script, con pruebas.

### Excluido

- navegación a orígenes distintos del autorizado: la grabación no continúa fuera del dominio permitido (coherente con la restricción por dominio de `005`);
- iframes de terceros y shadow DOM cerrado;
- E2E de navegador automatizado (diferido).

## 4. Requisitos funcionales

- RF-001: al iniciar grabación se registra un content script para `origin/*` si no existía.
- RF-002: una recarga o navegación de documento dentro del origen vuelve a inyectar el grabador y la grabación continúa sin intervención.
- RF-003: al detener, si no queda ninguna pestaña grabando ese origen, se desregistra el content script.
- RF-004: una navegación fuera del origen autorizado no inyecta el grabador (no se graba fuera del dominio permitido).

## 5. Requisitos no funcionales

- RNF-001 (seguridad): el registro se acota al origen ya autorizado; no se solicitan ni usan permisos nuevos.
- RNF-002 (mantenibilidad): patrón de coincidencia e id se calculan en un módulo puro testeable.
- RNF-003: el registro es idempotente (no falla si ya existe).

## 6. Diseño propuesto

- `extension/src/background/origins.ts` (puro): `originMatchPattern(origin)` → `origin + "/*"`; `contentScriptId(origin)` → id saneado estable.
- `service-worker.ts`: la sesión por pestaña pasa a guardar también el `origin`. `startRecording` registra el content script para el origen (si falta) además de inyectarlo en la página actual. `stopRecording` desregistra si ningún `origin` igual permanece en sesión.
- El grabador ya reanuda mediante `RUTEA_IS_RECORDING`; las instancias inyectadas en pestañas no grabadoras del mismo origen quedan inertes (`recording=false`).

## 7. Pruebas

- [x] `originMatchPattern` y `contentScriptId`: deterministas, id válido, distinto por origen (5 casos Vitest; 36 totales).
- [ ] verificación manual en Chrome sobre los fixtures (navegación SPA y recarga) — el E2E automatizado queda diferido.

## 8. Criterios de aceptación

- CA-001: grabar, recargar la página del origen autorizado y comprobar que la grabación continúa.
- CA-002: navegar dentro del origen (otra ruta) mantiene la grabación.
- CA-003: detener desregistra el content script cuando procede.
- CA-004: no se añaden permisos respecto a la 010.

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-27: se usa `registerContentScripts` (no `webNavigation`) por requerir menos permisos y reinyectar de forma declarativa sobre el origen autorizado.

## 15. Resultado implementado

Completar al mover a `implementado`.

Commit/PR: Pendiente
Verificación: Pendiente
Riesgo residual: Pendiente
