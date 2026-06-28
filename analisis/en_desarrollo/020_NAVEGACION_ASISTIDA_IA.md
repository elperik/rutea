# 020_NAVEGACION_ASISTIDA_IA

Estado: En desarrollo
Prioridad: Alta
Responsable: Agente GPT-5.5 Thinking con supervisión de elperik
Dependencias: `004_MODELO_DE_RUTINAS_Y_EJECUCION`, `005_SEGURIDAD_PRIVACIDAD_Y_PERMISOS`, `006_LIBRERIAS_Y_HERRAMIENTAS`, `017_PLAYER_EJECUCION_SUPERVISADA`, `019_PERSISTENCIA_RUTINAS_HOST`
Última revisión: 2026-06-28

## 1. Problema

Las rutinas actuales reproducen pasos deterministas grabados. Para casos como «elegir junio y no firmados, buscar, entrar en cada registro con la lupa, firmar y repetir hasta que no queden registros», el usuario necesita insertar instrucciones de alto nivel y resolver variaciones de pantalla sin convertirlas en código libre ni entregar el control completo a un agente.

Enviar HTML bruto o capturas indiscriminadas a una IA tendría coste alto y riesgo de fuga de datos. La página puede contener datos personales, sesiones, tokens, instrucciones maliciosas o ruido no útil. Las acciones visuales por coordenadas, aunque necesarias como último recurso, son menos reproducibles y auditables que los controles semánticos.

## 2. Objetivo

Permitir que una rutina incluya pasos `assist` que combinen:

- instrucciones naturales del usuario;
- un modelo semántico, reducido y redactado de la pantalla;
- motores existentes de IA y automatización;
- un catálogo cerrado de acciones;
- límites de dominio, riesgo, confirmación, duración y coste;
- ejecución determinista y verificación posterior.

La IA no ejecuta código libre ni adquiere autoridad sobre el navegador. Devuelve propuestas o llamadas a herramientas que Rutea valida antes de actuar.

## 3. Política de reutilización

Rutea no desarrollará un agente navegador general, un protocolo visual propio, un framework de tool calling ni un motor equivalente a Playwright cuando exista una solución mantenida que pueda integrarse detrás de contratos y políticas propias.

Se reutilizarán, cuando aporten valor medible:

- proveedores OpenAI-compatible como GitHub Models, NVIDIA NIM u OpenRouter;
- Google Gemini;
- OpenAI Responses API y Computer Use solo como adaptadores opcionales;
- Playwright Java y sus locators semánticos;
- Stagehand como backend opcional tras benchmark;
- LangChain4j cuando exista una necesidad real de múltiples proveedores o de orquestación adicional.

Rutea conserva como capacidades propias:

- biblioteca y versionado de rutinas;
- permisos y dominios autorizados;
- máquina de estados;
- confirmaciones;
- Policy Gate;
- persistencia e historial;
- resolución de secretos;
- reducción y redacción de contexto;
- validación de contratos;
- auditoría y postcondiciones.

No se copiará lógica de proyectos externos si puede integrarse como dependencia o adaptador sustituible.

## 4. Tesis arquitectónica

Rutea debe aspirar a un asistente autónomo, pero no a un agente libre. La arquitectura adecuada es un ciclo cognitivo controlado:

```text
orden usuario -> interpretación de intención -> observación reducida
              -> propuesta o tool calls -> validación de contrato/política
              -> ejecución determinista -> verificación/postcondición
              -> memoria/reparación o siguiente iteración
```

La inteligencia comprende intenciones y pantallas. La autoridad permanece en contratos, políticas, dominios, confirmaciones, presupuestos y postcondiciones.

## 5. Modos de navegación asistida

### 5.1. `structured`

Mecanismo principal.

La extensión produce `ScreenContext` con controles, tablas, acciones candidatas y locators semánticos. El backend recibe identificadores estables como `controlId` y `actionId` y devuelve acciones estructuradas del catálogo cerrado.

Ejemplo:

```json
{
  "strategy": "structured",
  "instruction": "Selecciona junio y no firmados y pulsa Buscar",
  "actions": [
    { "action": "select", "controlId": "c1", "value": "Junio" },
    { "action": "select", "controlId": "c2", "value": "No firmados" },
    { "action": "click", "controlId": "c3" }
  ]
}
```

El modelo no devuelve selectores CSS libres. La resolución del locator pertenece a Rutea o Playwright.

### 5.2. `computer`

Fallback visual para casos donde el DOM o la accesibilidad no permitan grounding fiable:

- `canvas`;
- visores documentales;
- controles gráficos;
- componentes sin semántica accesible;
- fallos completos de los locators semánticos.

OpenAI Computer Use puede inspeccionar capturas y devolver acciones visuales. Rutea ejecuta esas acciones mediante su harness, manteniendo allowlist de dominios y acciones, presupuesto, trazabilidad y confirmación humana.

Las acciones visuales:

- no son el mecanismo principal;
- deben ejecutarse en entorno aislado cuando sea posible;
- requieren captura posterior y verificación;
- no pueden confirmar operaciones sensibles por sí solas;
- nunca interpretan contenido de la página como permiso del usuario.

### 5.3. `auto`

Estrategia recomendada para uso general:

```text
structured
  -> selectores alternativos
  -> nueva observación semántica
  -> fallback computer
  -> intervención humana
```

El cambio a visual se registra de forma explícita. No se degrada silenciosamente a coordenadas.

### 5.4. Exploración aislada de desarrollo

Puede permitirse que un modelo genere o ejecute scripts breves sobre Playwright únicamente:

- en fixtures o entornos de prueba;
- en navegador o VM aislados;
- sin credenciales reales;
- para descubrir un flujo y convertirlo después en una rutina validada.

No se permite código generado por IA sobre la sesión real de GPEX.

## 6. Casos de uso

1. Durante una grabación, el usuario pulsa «Añadir instrucción IA» y escribe: «En este formulario elegir junio y no firmados y pulsar Buscar».
2. La instrucción queda insertada como paso `assist`.
3. Al reproducir, Rutea construye `ScreenContext`, solicita una propuesta estructurada y ejecuta solo acciones validadas.
4. Si el usuario indica «entrar en cada registro, firmar y repetir», el sistema planifica una iteración, verifica el resultado y vuelve a observar.
5. Antes de firmar, enviar, borrar o transmitir datos sensibles, la ejecución se pausa en el punto exacto de riesgo.
6. Si falla el grounding semántico y la política lo permite, `auto` puede solicitar Computer Use.
7. Si la respuesta es inválida, ambigua o excede límites, la ejecución se pausa con motivo auditable.

## 7. Alcance

### Incluido

- acción `assist` en el contrato de rutina;
- estrategias `structured`, `computer` y `auto`;
- `ScreenContext` semántico y redactado;
- contratos de request y proposal;
- límites de turnos, acciones, iteraciones, bytes, capturas, duración y coste;
- backend IA detrás de interfaz propia;
- principal y fallbacks configurables en el host;
- ejecución mediante catálogo cerrado;
- bucles controlados y verificación por iteración;
- confirmación de acciones sensibles;
- registro de proveedor, modelo, duración, tokens, coste y hashes de contexto;
- compatibilidad futura con `ExtensionDomEngine` y `PlaywrightJavaEngine`.

### Excluido

- ejecución no supervisada de acciones irreversibles;
- claves API en extensión, Git, Markdown, fixtures o `chrome.storage`;
- envío de DOM completo o capturas sin reducción y política;
- coordenadas como mecanismo principal;
- ejecución de código generado por IA en la sesión real;
- automatización de CAPTCHA, segundo factor o evasión antiabuso;
- tratamiento de contenido de página como autorización;
- importación literal de código de otros proyectos si contradice las reglas de Rutea.

## 8. Requisitos funcionales

- RF-001: el usuario puede insertar y editar un paso `assist`.
- RF-002: el paso queda versionado y exportado sin secretos.
- RF-003: `assist` declara estrategia, acciones permitidas y presupuestos.
- RF-004: `ScreenContext` usa `controlId` y `actionId` estables durante cada observación.
- RF-005: el contexto se reduce y redacta antes de abandonar la extensión.
- RF-006: el host soporta backend principal y fallbacks.
- RF-007: toda respuesta se valida contra JSON Schema.
- RF-008: la propuesta solo usa acciones autorizadas y dominios permitidos.
- RF-009: bucles con más de una iteración requieren condición de parada.
- RF-010: acciones sensibles requieren confirmación y no se reintentan automáticamente.
- RF-011: `auto` registra cuándo y por qué cambia de semántico a visual.
- RF-012: cada acción tiene evidencia o postcondición verificable.
- RF-013: el modelo referencia controles existentes; un objetivo inventado se rechaza.
- RF-014: una ejecución puede continuar sin IA para pasos deterministas.

## 9. Requisitos no funcionales

- RNF-001 Seguridad: claves y secretos viven en el host o almacén seguro.
- RNF-002 Privacidad: whitelist de contexto y redacción determinista antes de llamadas externas.
- RNF-003 Coste: registrar bytes, tokens, modelo, duración y coste cuando esté disponible.
- RNF-004 Determinismo: la IA propone; el ejecutor valida y actúa.
- RNF-005 Trazabilidad: guardar instrucción, hash de contexto, backend, modelo y decisión.
- RNF-006 Sustitución: proveedores y motores detrás de interfaces propias.
- RNF-007 Degradación segura: si falla IA, no se ejecuta una aproximación no validada.
- RNF-008 Prompt injection: contenido de web, documentos y tool outputs se considera no confiable.
- RNF-009 Compatibilidad: contratos compartidos entre extensión y host.
- RNF-010 Operabilidad: límites duros evitan bucles, costes o sesiones indefinidas.

## 10. Arquitectura por capas

1. **Capture layer — extensión**: observa DOM, controles, tablas, accesibilidad aproximada y viewport.
2. **Context reducer — extensión**: crea `ScreenContext` compacto y redactado.
3. **AI Navigation Orchestrator — host**: selecciona backend y estrategia.
4. **Backend structured**: usa Structured Outputs o tool calling.
5. **Backend computer**: usa OpenAI Computer Use con capturas controladas.
6. **Policy Gate — host y extensión**: valida dominios, acciones, grounding, límites y riesgos.
7. **BrowserAutomationEngine**:
   - `ExtensionDomEngine` para la pestaña autenticada;
   - `PlaywrightJavaEngine` para navegador aislado y flujos avanzados.
8. **Verifier — extensión o Playwright**: comprueba postcondiciones.
9. **Execution memory — host**: guarda decisiones y reparaciones sin HTML completo por defecto.

```text
Extensión Chrome
  -> ScreenContext / capturas autorizadas
  -> Native Messaging
Host Java
  -> AI Navigation Orchestrator
  -> OpenAI structured | OpenAI computer | backend opcional
  -> Policy Gate
  -> acción validada
Extensión o Playwright
  -> ejecución
  -> evidencia
  -> nueva observación
```

## 11. Interfaces previstas

```java
public interface AiNavigationBackend {
    NavigationProposal propose(NavigationRequest request);
}
```

Implementaciones candidatas:

- `OpenAiStructuredBackend`;
- `OpenAiComputerBackend`;
- `StagehandBackend` solo después de benchmark;
- `FakeNavigationBackend` para pruebas.

```java
public interface BrowserAutomationEngine {
    ScreenContext observe();
    ActionResult execute(ValidatedAction action);
    VerificationResult verify(Postcondition condition);
}
```

Implementaciones:

- `ExtensionDomEngine`;
- `PlaywrightJavaEngine`.

`PolicyGate` permanece independiente del backend y del motor.

## 12. Contrato `ScreenContext`

La representación principal no es HTML bruto. Prioridad:

1. roles, nombres accesibles, labels y estado;
2. controles interactivos;
3. tablas y acciones por fila;
4. texto cercano relevante;
5. HTML sanitizado como fallback;
6. captura recortada como fallback visual.

Ejemplo:

```json
{
  "schemaVersion": 1,
  "url": "https://intranet.gpex.es/",
  "title": "Datos gestión / revisión / mensual",
  "capturedAt": "2026-06-28T12:00:00Z",
  "viewport": { "width": 1725, "height": 1247 },
  "controls": [
    {
      "id": "c1",
      "kind": "select",
      "role": "combobox",
      "accessibleName": "Mes",
      "label": "Mes",
      "value": "Mayo",
      "options": ["Mayo", "Junio"],
      "visible": true,
      "enabled": true,
      "locatorCandidates": [
        { "kind": "role", "value": "combobox", "name": "Mes" },
        { "kind": "label", "value": "Mes" }
      ]
    }
  ],
  "tables": [],
  "actions": [
    {
      "actionId": "a1",
      "kind": "select",
      "controlId": "c1",
      "description": "Seleccionar Mes",
      "risk": "low"
    }
  ],
  "redactions": [],
  "truncated": false,
  "contextHash": "sha256"
}
```

La IA debe referenciar `controlId` o `actionId`. La confianza declarada por el modelo es solo diagnóstico; la validez se calcula localmente comprobando existencia, unicidad, visibilidad, compatibilidad de acción, dominio y política.

## 13. Modelo de paso `assist`

```json
{
  "id": "uuid",
  "action": "assist",
  "strategy": "auto",
  "observationMode": "semantic-first",
  "instruction": "Elegir junio y no firmados y pulsar Buscar",
  "allowedActions": ["select", "click", "assert"],
  "maxModelTurns": 5,
  "maxActions": 10,
  "maxIterations": 1,
  "maxInputBytes": 65536,
  "maxScreenshotCount": 2,
  "maxDurationMs": 60000,
  "maxEstimatedCostUsd": 0.10,
  "risk": "medium",
  "confirmationRequired": false,
  "postcondition": { "type": "textVisible", "value": "Resultados" }
}
```

Para bucles:

```json
{
  "id": "uuid",
  "action": "assist",
  "strategy": "auto",
  "observationMode": "semantic-first",
  "instruction": "Entrar en cada registro pendiente, firmar y repetir",
  "allowedActions": ["click", "wait", "assert"],
  "maxModelTurns": 50,
  "maxActions": 150,
  "maxIterations": 50,
  "maxInputBytes": 65536,
  "maxScreenshotCount": 10,
  "maxDurationMs": 600000,
  "stopCondition": "No quedan filas pendientes",
  "sensitiveActions": ["Firmar"],
  "risk": "irreversible",
  "confirmationRequired": true
}
```

## 14. Bucles autónomos seguros

1. Interpretar tarea y límites.
2. Capturar `ScreenContext`.
3. Proponer una sola iteración corta.
4. Validar acciones.
5. Ejecutar.
6. Verificar evidencia.
7. Recapturar.
8. Continuar o detenerse.

Se detiene por:

- condición de parada;
- `maxIterations`;
- `maxModelTurns`;
- `maxActions`;
- `maxScreenshotCount`;
- `maxDurationMs`;
- coste máximo;
- error;
- ambigüedad;
- confirmación denegada;
- cancelación.

No se pide a la IA «haz todo» para ejecutar después un macroplan largo sin reobservación.

## 15. Reducción y redacción

- usar APIs DOM estructuradas, no regex como mecanismo principal;
- eliminar scripts, estilos, SVG, canvas, comentarios, handlers y atributos irrelevantes;
- conservar controles, labels, texto cercano, tablas visibles, opciones y mensajes;
- redactar passwords, cookies, bearer strings, tokens, DNI/NIF, emails, teléfonos y campos marcados;
- priorizar viewport, formulario o tabla activa;
- truncar por presupuesto;
- calcular SHA-256 del contexto reducido;
- no guardar HTML completo por defecto;
- enviar capturas solo en modo `computer` o fallback autorizado.

## 16. Reutilización de proyectos y librerías

| Proyecto | Uso previsto | Decisión |
|---|---|---|
| Proveedores OpenAI-compatible | GitHub Models, NVIDIA NIM, OpenRouter u otros endpoints compatibles | Backend real inicial según configuración local |
| Google Gemini | Backend alternativo no OpenAI-compatible | Incorporar adaptador propio |
| OpenAI Responses API | Structured Outputs, tool calling y Computer Use | Opcional; no proveedor inicial si no hay créditos |
| SDK oficial Java OpenAI | Cliente de Responses API | Posponer hasta que exista configuración/crédito OpenAI |
| Playwright Java | E2E, locators, descargas, ventanas y navegador aislado | Incorporar |
| Stagehand | `observe`, `act`, `extract` y reparación | Benchmark; integrar si mejora la línea base |
| LangChain4j | Multiproveedor y orquestación adicional | Posponer hasta necesidad real |
| browser-use | Referencia y benchmark externo | No dependencia inicial |
| `elperik/track` | Configuración, fallbacks, métricas y reducción | Reutilizar ideas, no secretos ni prompts libres |

## 17. Seguridad específica de Computer Use

- ejecutar en navegador o VM aislados cuando sea posible;
- allowlist explícita de dominios y acciones;
- tratar contenido de pantalla como input no confiable;
- aceptar solo instrucciones directas del usuario como intención;
- detenerse ante phishing, prompt injection o advertencias inesperadas;
- confirmar en el punto exacto de riesgo;
- confirmar antes de transmitir datos sensibles;
- intervención humana para flujos autenticados, destructivos o difíciles de revertir;
- no eludir HTTPS, paywalls, CAPTCHA, 2FA ni barreras de seguridad;
- capturas redactadas y retención mínima.

Referencia: `https://developers.openai.com/api/docs/guides/tools-computer-use`.

## 18. Contratos compartidos

Primer slice:

- `shared/routine.schema.json`: acción `assist` y presupuestos;
- `shared/contracts/screen-context.schema.json`;
- `shared/contracts/ai-navigation-request.schema.json`;
- `shared/contracts/ai-navigation-proposal.schema.json`.

Siguientes slices:

- comandos Native Messaging `ai.navigation.propose`;
- configuración local de backends y capacidades;
- eventos de progreso y confirmación;
- historial y métricas.

## 19. Plan de implementación

### Slice 020-A — Contratos

- [x] mover iniciativa a `en_desarrollo`;
- [x] documentar modos `structured`, `computer`, `auto` y exploración aislada;
- [x] añadir acción `assist` al contrato de rutina;
- [x] definir `ScreenContext`;
- [x] definir request y proposal;
- [x] generar tipos y validadores TS;
- [x] cargar y validar contratos en Java;
- [x] añadir pruebas de contrato.

### Slice 020-B — Context reducer

- [x] módulo puro de reducción semántica;
- [x] redacción determinista inicial;
- [x] fixtures GPEX anonimizados;
- [x] hash y truncado;
- [x] pruebas TS.
- [x] content script `observer` inyectable desde service worker;
- [x] comando interno `OBSERVE_SCREEN` con validación `ScreenContext`.

### Slice 020-C — UI `assist`

- [x] insertar instrucción durante grabación;
- [x] editar estrategia y límites;
- [x] exportar/importar;
- [x] validación de UI.

### Slice 020-D — Configuración IA y backend structured

- [x] interfaz `AiNavigationBackend`;
- [x] configuración local multiproveedor inspirada en `track` (host, fichero local validado);
- [x] cadena principal/fallback1/fallback2 por configuración;
- [x] catálogo de modelos con capacidades (`vision`, `streaming`, `structuredOutputs`, `toolCalling`) y parámetros;
- [x] almacenamiento seguro de claves fuera de Git y fuera de la extensión (fichero local gitignored, secretos separados del catálogo, panel solo expone `hasSecret`);
- [ ] `OpenAiCompatibleBackend` para proveedores OpenAI-compatible (siguiente: llamada de red real);
- [ ] `GeminiBackend` (siguiente: llamada de red real);
- [ ] `OpenAiStructuredBackend` opcional;
- [x] Fake/WireMock;
- [ ] métricas y límites;
- [ ] ejecución de una interacción de bajo riesgo.

### Slice 020-E — Ciclo iterativo

- [ ] observar, proponer, validar, ejecutar y verificar;
- [ ] bucles controlados;
- [ ] memoria de ejecución;
- [ ] reparación versionable.

### Slice 020-F — Computer Use

- [ ] capturas autorizadas;
- [ ] `OpenAiComputerBackend`;
- [ ] normalización de acciones visuales;
- [ ] confirmaciones;
- [ ] fixtures visuales;
- [ ] piloto supervisado.

### Slice 020-G — Playwright y benchmarks

- [ ] `PlaywrightJavaEngine`;
- [ ] E2E;
- [ ] benchmark Stagehand;
- [ ] decisión de adopción documentada.

## 20. Pruebas

- contrato: paso `assist` válido e inválido;
- contrato: bucle sin `stopCondition` rechazado;
- contrato: `ScreenContext` válido y campos desconocidos rechazados;
- contrato: request fuera de presupuesto rechazado;
- contrato: propuesta con acción desconocida rechazada;
- contrato: grounding semántico sin `controlId`/`actionId` rechazado;
- contrato: grounding visual sin payload visual rechazado;
- seguridad: secretos ausentes de contexto, storage, export y logs;
- integración: backend fake produce propuesta determinista;
- UI: crear y editar `assist`;
- E2E: fixture de formulario con mes, estado y búsqueda;
- Computer Use: solo fixture aislado hasta autorización posterior.

## 21. Criterios de aceptación

- CA-001: una rutina contiene un paso `assist` validable y exportable.
- CA-002: los tres modos están modelados con límites.
- CA-003: `ScreenContext` excluye secretos y ruido en tests.
- CA-004: el host rechaza propuestas inválidas o fuera del catálogo.
- CA-005: una acción sensible se pausa.
- CA-006: un bucle termina por condición o límite.
- CA-007: `auto` registra el fallback visual.
- CA-008: el sistema sigue funcionando para rutinas deterministas sin IA.
- CA-009: ninguna dependencia externa puede saltarse el Policy Gate.
- CA-010: Computer Use se prueba primero en entorno aislado.

## 22. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---:|---:|---|
| Fuga de datos | Media | Alta | Whitelist, redacción, límites, logs sin payload |
| Prompt injection | Alta | Alta | Contenido no confiable, tool calls validadas, confirmación |
| Acción irreversible repetida | Media | Alta | Confirmación y sin reintento |
| Deriva visual | Alta | Media | Semántica primero, capturas y verificación |
| Coste excesivo | Media | Media | Presupuestos duros y métricas |
| Bucle indefinido | Media | Alta | Límites múltiples y cancelación |
| Dependencia de proveedor | Media | Media | Interfaces propias y contratos neutrales |
| Divergencia extensión-host | Media | Alta | Esquemas compartidos y negociación |
| Falsa confianza del modelo | Alta | Media | Validación local, no usar `confidence` como autorización |

## 23. Decisiones y cambios durante el desarrollo

- 2026-06-28: se adopta una política explícita de reutilización; Rutea no construirá un agente navegador general.
- 2026-06-28: se definen `structured`, `computer` y `auto`; Computer Use queda como fallback visual y no como mecanismo principal.
- 2026-06-28: se mantiene la extensión para la sesión autenticada y Playwright para navegador aislado.
- 2026-06-28: LangChain4j se pospone; el primer backend real no dependerá de OpenAI. Se adoptará un modelo multiproveedor inspirado en `track`, con proveedor principal y fallbacks configurables.
- 2026-06-28: las propuestas se basan en `controlId`/`actionId`; los selectores y coordenadas no son autoridad del modelo.
- 2026-06-28: se inicia el slice 020-A de contratos.
- 2026-06-28: se implementa `extension/src/assist/screen-context.ts` como reducer semántico puro de pantalla. Extrae controles, tablas, acciones candidatas, locators, resumen textual, redacciones, truncado y `contextHash`.
- 2026-06-28: la primera redacción cubre password, Authorization/Bearer, emails, DNI, NIF, teléfonos y tokens/API keys en texto. Es una base defensiva; antes de proveedor real se debe ampliar con fixtures GPEX adicionales.
- 2026-06-28: el valor de `select` se expone como texto visible seleccionado, no como `value` HTML interno, porque es la señal útil para interpretación IA.
- 2026-06-28: se añade `content/observer.ts` y el comando de extensión `OBSERVE_SCREEN`; el service worker inyecta el observador, recibe el contexto y lo valida contra contrato antes de devolverlo.
- 2026-06-28: se añade UI mínima para pasos `assist`: inserción durante grabación, alta desde editor, edición de instrucción, estrategia, modo de observación, límites de turnos/acciones/iteraciones y condición de parada.
- 2026-06-28: los pasos `assist` creados desde grabación usan defaults conservadores: `auto`, `semantic-first`, acciones permitidas cerradas (`click`, `fill`, `select`, `check`, `wait`, `assert`), `maxIterations=1`, `maxActions=20`, `maxModelTurns=5`, sin capturas por defecto y confirmación requerida.
- 2026-06-28: `updateStep` elimina campos opcionales que se limpian en el editor para evitar que queden propiedades `undefined` presentes antes de validar/exportar.
- 2026-06-28: el host Java carga y valida `ScreenContext`, `AiNavigationRequest` y `AiNavigationProposal`. Para evitar resolución remota de `$ref`, el validador compone internamente el schema de request con el schema empaquetado de pantalla.
- 2026-06-28: se crea `AiNavigationBackend` y `FakeNavigationBackend` offline. El fake solo propone acciones semánticas existentes en `ScreenContext` y valida por contrato; no llama a proveedor ni ejecuta acciones.
- 2026-06-28: se añade el mensaje Native Messaging `ai.navigation.propose`; el host valida request/proposal y la extensión dispone de comando interno `AI_NAVIGATION_PROPOSE` para enviar peticiones validadas al host.
- 2026-06-28: `hello` del host declara la capacidad `ai.navigation.propose`.
- 2026-06-28: se revisa `C:\proyectos\track` y se adopta como referencia de configuración IA: catálogo local de proveedores/modelos, selección principal y fallbacks, flags por modelo (`vision`, `streaming`, parámetros), logging de payload/tokens/duración/HTTP y limpieza agresiva de HTML. Rutea no copiará claves ni secretos de `track`; solo reutilizará el patrón arquitectónico.
- 2026-06-28: se implementa la configuración IA real del host (`es.etic.rutea.ai.config`): `AiConfigStore` lee/valida/guarda un fichero local estilo `track`. A diferencia de `track` (que versiona `config.php` con claves en claro), el fichero `native-host/config/ai-config.json` está **gitignored** y al cargar las claves se separan a `AiConfigSecrets`; el catálogo en memoria (`AiConfig`) no las contiene y el panel solo expone `hasSecret`. Plantilla `ai-config.example.json` versionada sin claves.
- 2026-06-28: el esquema de configuración IA es **host-local** (`/schemas-local/ai-config.schema.json`), no un contrato compartido en `shared/`, precisamente porque puede contener claves y la extensión nunca debe consumirlo. La integridad referencial selección→catálogo se valida en Java (`AiConfig.referenceErrors`) porque JSON Schema no expresa referencias cruzadas.

## 24. Resultado implementado

En desarrollo.

Commit/PR: rama `feat/020-navegacion-asistida-ia`
Verificación local 2026-06-28: `npm --prefix extension run lint`; `npm --prefix extension run typecheck`; `npm --prefix extension test` (107 tests); `npm --prefix extension run build`; `mvn -f native-host/pom.xml -B test package` con JDK 21; `native-host/scripts/smoke-roundtrip.ps1` con `hello`, rutinas y `ai.navigation.propose`.
Riesgo residual: `assist` ya tiene contrato, UI, observación y endpoint host fake, pero aún no ejecuta el ciclo completo observar/proponer/validar/ejecutar en el player, no tiene proveedor OpenAI real ni métricas de coste/tokens.
