# 021_PANEL_CONTROL_CONFIGURACION_IA

Estado: En desarrollo
Prioridad: Alta
Responsable: Agente GPT-5.5 Thinking con supervision de elperik
Dependencias: `020_NAVEGACION_ASISTIDA_IA`, `019_PERSISTENCIA_RUTINAS_HOST`, `005_SEGURIDAD_PRIVACIDAD_Y_PERMISOS`
Ultima revision: 2026-06-28

## 1. Problema

Rutea necesita una interfaz de administracion para configurar proveedores IA, ver proyectos/rutinas, probar modelos, consultar metricas y diagnosticar fallos. Esta interfaz no debe vivir solo en la extension Chrome porque manejara claves, endpoints, historiales y pruebas de proveedores.

La extension actual tambien necesita una mejora visual: debe sentirse como una herramienta de operacion fiable, no como un prototipo tecnico.

## 2. Objetivo

Construir un panel de control local servido por el host Java para configuracion y observabilidad, y mantener la extension Chrome como panel contextual para grabar, ejecutar y asistir navegaciones.

## 3. Alcance

### Incluido

- panel local del host en `127.0.0.1` con UI web;
- listado de proyectos/rutinas y estado operativo;
- catalogo de proveedores IA y modelos;
- configuracion principal/fallback1/fallback2 inspirada en `track`;
- prueba de proveedores/modelos con prompt controlado;
- metricas de llamadas IA: proveedor, modelo, latencia, HTTP, bytes, tokens si existen, resultado;
- gestion segura de claves desde el host;
- boton/enlace desde la extension para abrir el panel;
- mejora estetica de la extension Chrome.

### Excluido

- guardar claves en la extension o `chrome.storage`;
- exponer el panel en red externa por defecto;
- ejecutar acciones de navegacion desde el panel sin pasar por contratos y Policy Gate;
- copiar secretos o claves del repositorio `track`;
- depender de OpenAI como unico proveedor.

## 4. Casos de uso

1. El usuario abre el panel local y ve estado del host, version, rutas de datos y ultimas rutinas.
2. El usuario configura proveedores IA, modelos y fallbacks sin editar codigo.
3. El usuario prueba un modelo con un prompt simple y ve respuesta, latencia, tokens y error si falla.
4. El usuario abre la extension Chrome y accede al panel desde un boton de configuracion.
5. El usuario revisa metricas de llamadas IA para saber que proveedor funciona mejor.

## 5. Requisitos funcionales

- RF-001: el panel se sirve desde el host Java en loopback.
- RF-002: el panel permite listar proveedores/modelos disponibles.
- RF-003: el panel permite seleccionar principal, fallback1 y fallback2.
- RF-004: el panel permite probar un proveedor/modelo sin crear rutinas.
- RF-005: las claves se almacenan y leen solo desde el host.
- RF-006: la extension puede abrir el panel sin recibir secretos.
- RF-007: el panel muestra metricas de uso y errores de IA.
- RF-008: la configuracion se valida antes de guardarse.

## 6. Requisitos no funcionales

- RNF-001 Seguridad: servidor solo en `127.0.0.1` salvo autorizacion explicita.
- RNF-002 Seguridad: no escribir claves en logs, Markdown, exports ni stdout Native Messaging.
- RNF-003 UX: estetica limpia, densa y profesional, orientada a operacion.
- RNF-004 Operabilidad: mostrar fallos accionables de proveedor, red, cuota o credenciales.
- RNF-005 Sustitucion: proveedores detras de interfaces propias.
- RNF-006 Compatibilidad: no romper Native Messaging existente.

## 7. Diseno propuesto

Decision: el panel de control vive en `native-host`, servido por un HTTP server local embebido en Java. La extension Chrome no sera el panel principal de configuracion porque las claves y pruebas de proveedor pertenecen al host.

Arquitectura:

```text
Extension sidepanel
  -> abrir panel local
  -> grabar/ejecutar/asistir en pagina activa

Host Java
  -> HTTP local 127.0.0.1
  -> configuracion IA
  -> almacen seguro de claves
  -> metricas y pruebas de proveedores
  -> Native Messaging para extension
```

La UI debe ser una aplicacion web local con navegacion por secciones:

- Inicio: estado, version, salud del host, ultimos eventos.
- Proyectos/rutinas: biblioteca y dominios autorizados.
- IA: proveedores, modelos, capacidades, fallbacks y prueba.
- Metricas: llamadas, latencias, tokens, errores y coste estimado.
- Seguridad: rutas de almacenamiento, allowlists, confirmaciones y limpieza de datos.

## 8. Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decision |
|---|---|---|---|
| Panel completo en extension Chrome | Cerca del usuario durante navegacion | No debe manejar secretos; limitado para servidor local, metricas y almacenamiento | Rechazada |
| Panel local servido por Java | Secretos y persistencia quedan en host; facil probar proveedores y ver metricas | Requiere HTTP local y UI nueva | Aceptada |
| Aplicacion desktop JavaFX/Swing | Integracion local fuerte | Mas pesada, menos flexible y peor para UI moderna | Posponer |
| Solo ficheros de configuracion | Simple | Mala UX y dificil diagnostico | Rechazada |

## 9. Dependencias y librerias

- HTTP embebido Java: evaluar Javalin, Spark Java o `com.sun.net.httpserver` para primer corte.
- Frontend panel: HTML/CSS/TS estatico servido por host; evaluar framework ligero si crece.
- Almacen secreto: Windows Credential Manager o fichero cifrado protegido por usuario.
- Iconos: usar libreria solo si se adopta bundle frontend; si no, CSS/HTML sobrio sin iconografia pesada.

Antes de incorporar dependencias, documentar licencia, mantenimiento, tamano, seguridad y estrategia de sustitucion.

## 10. Plan de implementacion

- [x] definir contrato de configuracion IA (esquema host-local `ai-config.schema.json`);
- [x] crear almacenamiento local de configuracion sin claves en Git (fichero gitignored + plantilla);
- [x] crear servicio Java de configuracion IA (`AiConfigStore`, modelo `ai.config`);
- [x] crear endpoint local de salud;
- [x] crear panel HTML/CSS inicial servido por Java;
- [x] listar proveedores/modelos y fallbacks;
- [x] guardar configuracion validada (`POST /api/ai-config`);
- [x] gestionar claves desde el host (`POST /api/ai-secret`, nunca devueltas);
- [x] probar proveedor/modelo desde el panel;
- [x] registrar metricas de prueba;
- [x] abrir panel desde extension;
- [x] mejorar estetica de extension Chrome;
- [x] pruebas Java, extension y UI local.

## 11. Pruebas

- [x] Java: validacion de configuracion IA (esquema + integridad referencial, `AiConfigStoreTest`);
- [x] Java: servidor local solo loopback;
- [x] Java: secretos no aparecen en logs/respuestas (`guardaClaveSinDevolverSuValor`, separacion en `AiConfigStore`);
- [x] Java: prueba fake de proveedor;
- [x] Extension: boton abre panel sin secretos;
- [x] UI: capturas Playwright desktop/mobile del panel;
- [ ] Seguridad: escaneo de claves en repo (pendiente de automatizar en CI).

## 12. Criterios de aceptacion

- CA-001: existe una decision documentada host-vs-extension.
- CA-002: la extension no almacena ni muestra claves.
- CA-003: el panel permite ver y probar configuracion IA con proveedor fake.
- CA-004: la UI de extension y panel tienen aspecto profesional y consistente.
- CA-005: el panel no escucha fuera de loopback por defecto.

## 13. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigacion |
|---|---:|---:|---|
| Exponer claves | Media | Alta | Secretos solo host, redaccion y tests |
| Panel accesible desde red | Baja | Alta | Bind loopback, token local si hace falta |
| Duplicar logica entre extension y host | Media | Media | Extension abre panel; configuracion solo host |
| UI bonita pero poco operativa | Media | Media | Diseno denso, claro y orientado a diagnostico |
| Dependencia frontend innecesaria | Media | Baja | Primer corte estatico; framework solo si aporta valor |

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-28: se inicia la 021 moviendo el documento desde `analisis/pendiente` a `analisis/en_desarrollo`.
- 2026-06-28: el primer panel vive en el host Java y se sirve con `com.sun.net.httpserver.HttpServer`, sin dependencia nueva. Esto permite validar UX, loopback y contratos antes de incorporar un framework.
- 2026-06-28: el panel arranca solo en modo explicito `--panel`, escucha en `127.0.0.1` y usa el puerto `8765` por defecto. Native Messaging mantiene su ruta normal si no se pasa ese argumento.
- 2026-06-28: la extension solo abre `http://127.0.0.1:8765/`; no recibe configuracion sensible ni almacena claves.
- 2026-06-28: el primer proveedor probado es `fake/fake-structured`. OpenAI compatible y Gemini quedan visibles como proveedores planificados, pero requieren configuracion real y almacen seguro de secretos antes de usarse.
- 2026-06-28: las metricas actuales son de prueba de modelo: latencia, HTTP, tokens estimados y resultado. Falta persistir historico de llamadas IA reales.
- 2026-06-28: se implementa la configuracion IA real del host inspirada en `track`. Modelo en `es.etic.rutea.ai.config` (`AiConfig`, `AiProvider`, `AiModel`, `AiSelection`, `AiConfigStore`, `AiConfigSecrets`). Catalogo + seleccion principal/fallback1/fallback2; capacidades por modelo (`vision`, `streaming`, `structuredOutputs`, `toolCalling`) y `params` libres (acomoda OpenAI-compatible y Gemini).
- 2026-06-28: decision sobre claves. El usuario pidio "un fichero de configuracion dentro del proyecto, parecido a `track`". `track` versiona `config.php` con claves en claro, lo que contradice las restricciones de Rutea. Reconciliacion: fichero local unico estilo `track` (`native-host/config/ai-config.json`) con claves inline, pero **gitignored**, con plantilla `ai-config.example.json` versionada sin claves. Al cargar, las claves se separan a `AiConfigSecrets` (solo host); el panel nunca las devuelve, solo `hasSecret`. Ruta configurable con `--ai-config=`/`RUTEA_AI_CONFIG`; sin fichero se sirve un catalogo por defecto sin secretos.
- 2026-06-28: el esquema de config IA es host-local (`/schemas-local/ai-config.schema.json`), no `shared/`, porque puede contener secretos y la extension no debe consumirlo. `SchemaValidator.validateAiConfig` valida el fichero como frontera; la integridad selección→catalogo se valida en Java.
- 2026-06-28: nuevos endpoints del panel: `GET /api/ai-config` (catalogo redactado + `hasSecret` + `selection` + `configured`/`configPath`), `POST /api/ai-config` (guardar seleccion validada), `POST /api/ai-secret` (fijar/borrar clave por proveedor sin devolver su valor). `ai-test` exige clave para proveedores reales y responde `501 backend_not_implemented` (la llamada de red real es el siguiente slice).

## 15. Resultado implementado

Segundo corte (configuracion IA real):

- modelo de configuracion IA en `es.etic.rutea.ai.config` con catalogo de proveedores, capacidades por modelo, `params` libres y seleccion principal/fallback1/fallback2;
- `AiConfigStore`: carga/validacion (esquema + integridad referencial)/guardado de un fichero local estilo `track`, con separacion de claves a `AiConfigSecrets`;
- fichero local `native-host/config/ai-config.json` gitignored + plantilla `ai-config.example.json` versionada sin claves; catalogo por defecto empaquetado sin secretos;
- esquema host-local `/schemas-local/ai-config.schema.json` validado por `SchemaValidator`;
- endpoints reales: `GET /api/ai-config` (redactado), `POST /api/ai-config` (seleccion validada), `POST /api/ai-secret` (clave solo host, nunca devuelta);
- panel con estado de configuracion (origen y ruta), editor de seleccion principal/fallbacks y alta/borrado de clave por proveedor; el valor de la clave no se muestra;
- ruta de config configurable por `--ai-config=<ruta>` o `RUTEA_AI_CONFIG`.

Primer corte (previo): servidor local `LocalControlPanelServer`, panel web, `--panel`/`--panel-port`, boton `Abrir panel` en la extension, prueba fake de IA y capturas Playwright.

Commit/PR: rama `feat/020-navegacion-asistida-ia`
Verificacion local 2026-06-28:

- `npm --prefix extension run lint`; `npm --prefix extension run typecheck`; `npm --prefix extension run build`; `npm --prefix extension test` (107 tests) — OK;
- `mvn -f native-host/pom.xml -B test package` — 35 tests OK (incluye `AiConfigStoreTest` y `LocalControlPanelServerTest`);
- smoke en vivo (`--panel --panel-port=8799 --ai-config=<temp>`): `GET /api/ai-config` sirve catalogo por defecto sin `apiKey`; `POST /api/ai-secret` devuelve solo `hasSecret:true`; `POST /api/ai-config` persiste la seleccion (`configured:true`); la clave queda en el fichero del host y no aparece en ninguna respuesta del panel.

Riesgo residual:

- los backends de red reales (OpenAI-compatible/Gemini) aun no estan implementados; `ai-test` para proveedores reales responde `501 backend_not_implemented`. Por tanto no hay metricas de llamadas IA reales ni historico persistido;
- el almacen de claves es un fichero local con permisos del sistema de ficheros (no cifrado ni Credential Manager); queda detras de `AiConfigSecrets`/`AiConfigStore` para sustituirlo sin tocar el panel;
- el panel local todavia no usa token anti-CSRF/origen para llamadas desde navegador;
- el puerto fijo `8765` puede colisionar y requiere deteccion o configuracion de usuario;
- falta automatizar en CI un escaneo de claves del repo.
