# 009_CIERRE_FASE_0

Estado: Implementado
Prioridad: Alta
Responsable: Agente (sesión Claude Code) con supervisión de elperik
Dependencias: `000_ANDAMIAJE_INICIAL`, `002_PLAN_DESARROLLO_POR_FASES`, `003_ARQUITECTURA_Y_LIMITES`, `006_LIBRERIAS_Y_HERRAMIENTAS`
Última revisión: 2026-06-27

Commit/PR: PR #1 (merge `69b75ea`); contenido en `e8933d1` y `18ea986`
Verificación: extensión `format`/`lint`/`typecheck`/`build` + 18 tests Vitest; host Java 11 tests JUnit + `package` (uber-jar). Verde en local (Node 24; JDK 21 + Maven 3.9.16) y en CI (jobs `extension` y `native-host`).
Riesgo residual: validación de `format` en Java es anotación, no aserción (estructural sí aplica); sin pruebas E2E de navegador todavía (diferidas a Fase 1); el host aún no interpreta comandos de negocio más allá de `hello`.

## 1. Problema

La Fase 0 del plan (`002`) no está cerrada. El andamiaje compila, pero faltan capacidades exigidas por sus criterios de salida:

- la extensión y el host **no validan** mensajes en tiempo de ejecución; el host responde `ok:true` a cualquier entrada y solo cuenta bytes;
- el esquema `shared/routine.schema.json` **no se valida** en ningún componente;
- no existe **fuente de verdad única** de contratos (decisión abierta en `006`);
- no existe **sitio de fixtures** para pruebas;
- no existe **ninguna prueba** (el CI ejecuta `mvn test` sin tests y la extensión no tiene runner);
- el grabador (`recorder.ts`) produce un `target.selector` único incompatible con el descriptor de múltiples señales (`target.selectors[]`) del esquema y de `004`.

## 2. Objetivo

Cerrar la Fase 0 dejando contratos estables y validados en ambos lados, una base de pruebas mínima y un sitio de fixtures, de modo que la Fase 1 pueda construirse sobre contratos firmes.

## 3. Alcance

### Incluido

- decisión y materialización de la fuente de verdad de contratos: **JSON Schema** canónico en `shared/`;
- sobre de mensaje Native Messaging (request, response, negociación de capacidades) como esquema versionado;
- validación runtime con Ajv en la extensión y rechazo de mensajes inválidos;
- generación de tipos TypeScript desde los esquemas (sin mantener dos modelos a mano);
- tooling de extensión: ESLint, Prettier, Vitest;
- sitio de fixtures local y determinista para pruebas;
- validación runtime en el host Java (Jackson + validador JSON Schema) con respuestas de error estructuradas y negociación básica de protocolo;
- primera suite unitaria en TypeScript y Java;
- CI ampliado: typecheck, lint y pruebas en extensión; tests reales en Java.

### Excluido

- persistencia SQLite y secretos (Fase 4);
- ejecutor determinista (Fase 3);
- editor y biblioteca de rutinas (Fase 2);
- refuerzo completo del grabador entre navegaciones (Fase 1); aquí solo se alinea la **forma** del descriptor de objetivo al contrato.

## 4. Casos de uso

1. El service worker envía un mensaje al host; si la respuesta no cumple el contrato, se rechaza con error estructurado en lugar de propagar datos no validados.
2. El host recibe un mensaje malformado o de versión incompatible y responde con un error estructurado sin ejecutar lógica de negocio.
3. Un desarrollador ejecuta las pruebas de la extensión y del host en local/CI y obtiene cobertura básica de contratos.

## 5. Requisitos funcionales

- RF-001: la extensión valida el sobre de cada mensaje Native Messaging saliente y cada respuesta entrante contra su esquema.
- RF-002: el host valida cada mensaje entrante contra su esquema y responde con la taxonomía de errores de `003` (`VALIDATION_ERROR`, `UNSUPPORTED_PROTOCOL`, ...).
- RF-003: existe un endpoint de negociación (`hello`/`capabilities`) que acuerda la versión de protocolo soportada.
- RF-004: los tipos TypeScript de contratos se generan desde los esquemas JSON.
- RF-005: existe un sitio de fixtures servible localmente con los patrones de `007 §3`.

## 6. Requisitos no funcionales

- RNF-001 (seguridad): los esquemas rechazan campos desconocidos (`additionalProperties:false`) en contratos sensibles y acotan tamaños.
- RNF-002 (mantenibilidad): un único modelo por contrato; los tipos se derivan, no se duplican.
- RNF-003 (compatibilidad): el host sigue sin escribir nada fuera de protocolo en `stdout`.

## 7. Diseño propuesto

- **Contratos** en `shared/`: se conserva `routine.schema.json` y se añade un sobre `native-message` con variantes `request`/`response` y un mensaje `hello` de negociación. `protocolVersion` explícito.
- **Extensión**: módulo `src/contracts/` con tipos generados y un `validation.ts` que compila los esquemas con Ajv (`ajv` + `ajv-formats`) una sola vez y expone validadores tipados. El `service-worker` valida antes de confiar en cualquier respuesta nativa.
- **Host Java**: `messaging/` con un `MessageCodec` (lectura/escritura length-prefixed, ya existe en `NativeHostMain`) y un `MessageValidator` (NetworkNT JSON Schema Validator sobre los mismos esquemas de `shared/`, empaquetados como recurso). Respuestas con `ok`, `code`, `messageId`/`correlationId`.
- **Tipos compartidos**: los esquemas de `shared/` se consumen desde ambos lados (TS los importa para generar tipos y validar; Java los carga como recursos en el classpath).

## 8. Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decisión |
|---|---|---|---|
| JSON Schema fuente de verdad → tipos | un modelo, validado idéntico en TS y Java | generación de tipos como paso de build | **Elegida** |
| Zod fuente de verdad → JSON Schema | ergonomía en TS | Java necesita el schema generado igual; doble herramienta | Descartada |
| Validación manual a mano | sin dependencias | frágil, divergente, contra `006` | Descartada |

## 9. Dependencias y librerías

Extensión (dev): `ajv`, `ajv-formats`, `json-schema-to-typescript`, `eslint`, `@typescript-eslint/*`, `prettier`, `vitest`.
Host: `com.fasterxml.jackson.core:jackson-databind`, `com.networknt:json-schema-validator`, test: `org.junit.jupiter`, `org.assertj:assertj-core`.

Pendiente de completar la tabla de aprobación de `006 §5` para cada una en el commit que las introduce.

## 10. Plan de implementación

- [x] crear esta iniciativa en `en_desarrollo/`;
- [x] tooling extensión: ESLint + Prettier + Vitest (build migrado a esbuild por la necesidad de empaquetar dependencias);
- [x] definir esquemas de mensaje en `shared/contracts/` (native-message, native-response, hello);
- [x] generar tipos TS de contratos (`scripts/generate-contracts.mjs`);
- [x] validador standalone + pruebas (18 casos, incluidos válido mínimo/completo, falta requerido, campo desconocido, versión incompatible, tamaño excesivo);
- [x] integrar validación en `service-worker` (negociación `hello` con validación de salida y entrada);
- [x] sitio de fixtures local (`fixtures/`);
- [x] ampliar CI de la extensión (format:check, lint, typecheck, test, build);
- [x] validación host Java + JUnit (escrito; **pendiente de verificación vía CI**, sin JDK 21 + Maven en local);
- [x] alinear forma del descriptor de objetivo del grabador al contrato (`target.selectors[]`).

## 11. Pruebas

- [x] unitarias TS del validador (18 casos) — verificadas en local (Vitest 2.1.9) y en CI;
- [x] contrato (sobre, respuesta, hello, rutina) — verificadas en local y en CI;
- [x] unitarias Java (codec, validador, negociación) — 11 casos verdes en local (JDK 21 + Maven 3.9.16) y en CI;
- [ ] E2E/UI: diferida a Fase 1 (solo se prepara el sitio de fixtures);
- [x] seguridad: payloads malformados, sobredimensionados y campos desconocidos cubiertos en TS y Java.

## 12. Criterios de aceptación

- CA-001: un clon limpio compila la extensión y el host con un comando cada uno.
- CA-002: la extensión rechaza una respuesta nativa que no cumple el contrato.
- CA-003: el host rechaza un mensaje malformado o de versión incompatible con error estructurado.
- CA-004: existe una página de fixtures servible localmente.
- CA-005: CI ejecuta pruebas reales en extensión y Java y bloquea ante fallo.
- CA-006: no se mantienen dos modelos de contrato a mano; los tipos TS se generan del esquema.

## 13. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---:|---:|---|
| Entorno local sin JDK 21 + Maven impide verificar Java | Alta | Medio | Verificar Java vía CI; documentar; ofrecer instalar toolchain |
| Divergencia esquema/tipos | Media | Medio | Generación automática y prueba de contrato compartida |
| Sobre-ingeniería de contratos en Fase 0 | Media | Bajo | Mantener esquemas mínimos y versionados |

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-27: fuente de verdad de contratos = **JSON Schema** (resuelve decisión abierta de `006 §2`).
- 2026-06-27: inicialmente el entorno local solo tenía JDK 17 sin Maven; tras instalar JDK 21 (`C:\Program Files\Java\jdk-21.0.10`) y Maven 3.9.16 (`C:\apache-maven-3.9.16`), el host Java se verifica también en local. CI (PR #1) y local: extensión y host en verde.
- 2026-06-27: **CSP de Manifest V3** impide la compilación de esquemas en runtime con Ajv (`new Function`). Decisión: precompilar validadores **standalone** en build (sin `eval`) y empaquetar con **esbuild**. Se verificó que el bundle no contiene `eval`/`new Function` reales.
- 2026-06-27: el build de la extensión pasa de `tsc`-emit a **esbuild** (anticipado por `006 §2`). `tsc` queda solo para typecheck. Tres entrypoints: service worker y panel como ESM; `recorder` como IIFE por inyectarse como fichero suelto.
- 2026-06-27: contratos generados (`types.ts`, `validators.generated.*`) tratados como artefactos de build e ignorados en Git; se regeneran en `contracts`/`build`/`test`/`typecheck`.
- 2026-06-27: los esquemas de `shared/` se copian al classpath del host (`/schemas/`) vía maven-resources, evitando duplicar contratos.
- 2026-06-27: validación de `format` (uuid, date-time) activa en TS; en Java queda como anotación (no aserción) en Fase 0 — la validación estructural (required, enum, additionalProperties, tipos, límites) sí se aplica en ambos lados.

## 15. Resultado implementado

Fase 0 cerrada. Entregado:

- contratos JSON Schema en `shared/contracts/` (native-message, native-response, hello) más la rutina existente, como fuente de verdad única;
- generación automática de tipos TS y validadores standalone (`extension/scripts/generate-contracts.mjs`);
- build de la extensión migrado a esbuild; `tsc` solo para typecheck;
- validación runtime en la extensión (Ajv standalone, CSP-safe) y negociación `hello` en el service worker que valida entrada y salida;
- descriptor de objetivo del grabador alineado a `target.selectors[]`;
- host Java con `messaging/` (MessageCodec, SchemaValidator con NetworkNT, MessageHandler) y errores estructurados;
- sitio de fixtures determinista en `fixtures/`;
- CI con format:check, lint, typecheck, test y build en la extensión, y test+package en el host;
- ESLint, Prettier, Vitest, JUnit 5 y AssertJ adoptados.

Componentes principales nuevos: `shared/contracts/*.schema.json`, `extension/src/contracts/index.ts`, `extension/scripts/{generate-contracts,build}.mjs`, `native-host/.../messaging/*.java`, `fixtures/`.

Commit/PR: PR #1 (merge `69b75ea`).
Verificación: 18 tests TS + 11 tests Java verdes en local y CI; build y package correctos.
Riesgo residual: format no asertado en Java; sin E2E de navegador; host sin comandos de negocio aún.

## 16. Trabajo posterior recomendado

Fase 1 (grabador robusto): persistencia de grabación por pestaña entre navegaciones, reinyección tras recargas/SPA, deduplicación de eventos, puntuación de selectores múltiples, redacción de campos sensibles y pruebas sobre los fixtures.
</content>
</invoke>
