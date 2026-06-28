# 020_NAVEGACION_ASISTIDA_IA

Estado: Pendiente
Prioridad: Alta
Responsable: Sin asignar
Dependencias: `004_MODELO_DE_RUTINAS_Y_EJECUCION`, `005_SEGURIDAD_PRIVACIDAD_Y_PERMISOS`, `006_LIBRERIAS_Y_HERRAMIENTAS`, `017_PLAYER_EJECUCION_SUPERVISADA`, `019_PERSISTENCIA_RUTINAS_HOST`
Ultima revision: 2026-06-28

## 1. Problema

Las rutinas actuales reproducen pasos deterministas grabados. Para casos como "elegir junio y no firmados, buscar, entrar en cada registro con la lupa, firmar y repetir hasta que no queden registros", el usuario necesita dejar instrucciones de alto nivel durante la grabacion y que la reproduccion pueda resolver variaciones de pantalla sin convertir esas instrucciones en codigo libre.

Ademas, enviar HTML bruto a una IA tendria coste alto y riesgo de fuga de datos. La pagina puede contener datos personales, sesiones, tokens, textos maliciosos o ruido visual no util.

## 2. Objetivo

Permitir que el usuario inserte instrucciones asistidas en uno o varios puntos de una grabacion, guardarlas como parte validada de la rutina y, durante la reproduccion, pedir al host una propuesta de acciones estructuradas a partir de:

- instruccion natural del usuario;
- contexto reducido y redactado de la pantalla actual;
- catalogo cerrado de acciones permitidas;
- limites de dominio, riesgo, confirmacion y presupuesto.

La IA no ejecuta codigo ni decide fuera del contrato: devuelve una propuesta validable que el ejecutor transforma en acciones conocidas o en una pausa para confirmacion.

## 3. Alcance

### Incluido

- dialogo en el panel para anadir una instruccion asistida durante la grabacion y asociarla al punto actual de la secuencia;
- nuevo modelo de paso asistido o checkpoint IA en el contrato de rutina;
- captura de contexto de pantalla bajo demanda, con HTML reducido y redactado antes de salir de la extension;
- configuracion de proveedores IA en fichero local del host, con principal y fallbacks al estilo de `elperik/track`;
- adaptador IA en el host con respuesta JSON validada;
- propuesta estructurada de acciones del catalogo cerrado (`click`, `fill`, `select`, `check`, `wait`, `assert`, `navigate` cuando exista);
- reglas para bucles controlados: condicion de parada, maximo de iteraciones y confirmacion en acciones sensibles;
- pruebas unitarias de reduccion HTML, validacion de respuesta IA y rechazo de acciones fuera de catalogo.

### Excluido

- ejecucion no supervisada de acciones irreversibles;
- almacenamiento de claves API en la extension, repositorio, Markdown, fixtures o `chrome.storage`;
- envio de DOM completo o capturas sin redaccion;
- uso de coordenadas de pantalla como mecanismo principal;
- automatizacion de CAPTCHA, segundo factor o evasion antiabuso;
- importacion literal del codigo de `track` cuando contradiga las reglas de Rutea.

## 4. Casos de uso

1. Durante una grabacion, el usuario pulsa "Anadir instruccion IA", escribe: "en este formulario elegir el mes de junio y los no firmados y pulsar buscar", y la instruccion queda insertada como paso asistido.
2. El usuario anade otra instruccion: "con el resultado, ve entrando en cada registro pulsando la lupa y al entrar en el detalle pulsar firmar. La operacion se repetira hasta que no queden registros".
3. Al reproducir, Rutea captura el contexto reducido de la pantalla, pide al host una propuesta, valida que solo use acciones permitidas y solicita confirmacion antes de cualquier accion de riesgo alto o irreversible como firmar.
4. Si la IA no devuelve JSON valido, propone un objetivo ambiguo o excede limites, la ejecucion se pausa con motivo auditable.

## 5. Requisitos funcionales

- RF-001: el usuario puede insertar instrucciones asistidas en cualquier posicion de una grabacion antes de guardar la rutina.
- RF-002: una instruccion asistida queda versionada/exportada como parte del contrato, sin secretos.
- RF-003: el contexto enviado a IA se reduce a texto/estructura util y se redacta antes de abandonar la extension/host.
- RF-004: el host lee configuracion IA desde fichero local y soporta proveedor principal y fallbacks.
- RF-005: la respuesta IA debe validar contra un esquema de propuesta de acciones, sin campos desconocidos ni codigo ejecutable.
- RF-006: una propuesta solo puede contener acciones del catalogo cerrado y dominios autorizados.
- RF-007: bucles asistidos requieren `stopCondition`, `maxIterations` y resultado observable por iteracion.
- RF-008: acciones sensibles como firmar requieren confirmacion explicita y no se reintentan automaticamente.

## 6. Requisitos no funcionales

- RNF-001 (seguridad): claves API y secretos viven en el host/almacen seguro; nunca en la extension ni en la rutina exportada.
- RNF-002 (privacidad): HTML y textos sensibles se redactan con reglas deterministas antes de enviar a IA.
- RNF-003 (coste): cada llamada registra bytes de entrada, tokens si el proveedor los reporta, modelo, duracion y resultado.
- RNF-004 (determinismo): la IA propone; el ejecutor valida, confirma y ejecuta.
- RNF-005 (trazabilidad): cada decision asistida guarda instruccion, hash del contexto reducido, proveedor/modelo y propuesta aceptada o rechazada.

## 7. Diseno propuesto

### Tesis arquitectonica

Rutea debe aspirar a un asistente autonomo, pero no a un agente libre. La arquitectura adecuada es un **ciclo cognitivo controlado**:

```text
orden usuario -> interpretacion de intencion -> modelo compacto de pantalla
              -> plan propuesto -> validacion de contrato/politica
              -> ejecucion determinista -> verificacion/postcondicion
              -> memoria/reparacion o siguiente iteracion
```

La inteligencia se concentra en comprender intenciones y pantallas; la autoridad se mantiene en contratos, politicas, dominios, confirmaciones y postcondiciones.

### Capacidades cognitivas necesarias

- **Comprension de ordenes**: convertir instrucciones naturales largas en objetivos, subtareas, condiciones de parada, riesgos y datos de entrada. Ejemplo: separar "elegir junio y no firmados", "buscar", "recorrer resultados", "firmar detalle" y "repetir hasta que no queden registros".
- **Comprension de pantalla**: producir un modelo semantico de lo visible y accionable: formularios, labels, selects y opciones, botones, tablas, filas, acciones por fila, mensajes, navegacion y estado.
- **Grounding de acciones**: vincular cada accion propuesta con uno o varios candidatos DOM explicables, no con coordenadas. Debe registrar por que se eligio un control.
- **Planificacion incremental**: generar planes cortos y verificables, no un macroplan enorme. En bucles, planificar una iteracion, verificar resultado y decidir la siguiente.
- **Verificacion**: cada accion debe tener una senal de exito o fallo: cambio de URL, texto visible, desaparicion de fila, contador, mensaje, valor actualizado.
- **Recuperacion**: si un selector falla, pedir nueva interpretacion sobre el modelo de pantalla actual y conservar la reparacion como candidata versionable.
- **Autonomia acotada**: los bucles requieren maximo de iteraciones, condicion de parada y politica de riesgo. Acciones sensibles pausan siempre.

### Arquitectura por capas

1. **Capture layer (extension)**: observa la pagina real, captura DOM reducido, accesibilidad aproximada, controles y tablas visibles. No llama directamente a proveedores IA.
2. **Context reducer (extension, testeable)**: convierte la pantalla en `ScreenContext` compacto y redactado. Esta es la pieza clave para coste y privacidad.
3. **Intent planner (host)**: combina instruccion del usuario, rutina, historial y `ScreenContext` para producir `NavigationProposal`.
4. **Policy gate (host + extension)**: rechaza acciones fuera de catalogo, dominios no autorizados, propuestas ambiguas, costes excesivos o acciones sensibles sin confirmacion.
5. **Deterministic executor (extension/player o futuro Playwright)**: ejecuta solo acciones validadas.
6. **Verifier (extension)**: comprueba postcondiciones y devuelve evidencias estructuradas.
7. **Execution memory (host)**: guarda decisiones, candidatos, fallos, contexto hash y propuestas aceptadas/rechazadas para mejorar ejecuciones futuras sin almacenar HTML completo por defecto.

### Contrato de pantalla recomendado

Antes de enviar nada a IA, la extension debe construir un objeto como este:

```json
{
  "url": "https://soi.gpex.es/inicio.php",
  "title": "Datos gestion / revision / mensual",
  "viewport": { "width": 1725, "height": 1247 },
  "forms": [
    {
      "label": "Busqueda",
      "controls": [
        { "id": "c1", "kind": "select", "label": "Mes", "value": "Mayo", "options": ["Mayo", "Junio"] },
        { "id": "c2", "kind": "select", "label": "Firmadas", "value": "Mes No Firmado", "options": ["Mes Enviado", "Mes No Firmado"] },
        { "id": "c3", "kind": "button", "text": "Buscar" }
      ]
    }
  ],
  "tables": [
    {
      "label": "Resultados",
      "columns": ["Codigo", "Apellidos", "Seleccionar", "Enviado", "Firmado"],
      "rowsPreview": [],
      "rowCountVisible": 0
    }
  ],
  "actions": [
    { "actionId": "a1", "kind": "select", "label": "Mes", "target": { "selectors": ["..."] } },
    { "actionId": "a2", "kind": "click", "text": "Buscar", "target": { "selectors": ["..."] } }
  ],
  "redactions": ["password", "token", "dni", "email"],
  "truncated": false
}
```

La IA deberia devolver referencias a `actionId`/`control id` cuando sea posible. Si inventa un objetivo que no existe en `ScreenContext`, se rechaza o se pide aclaracion.

### Bucle autonomo seguro

Para secuencias repetitivas como "entrar en cada registro, firmar, repetir hasta que no queden registros":

1. El planner interpreta la tarea y exige `maxIterations`.
2. El reducer detecta tabla/filas/acciones por fila.
3. La IA propone una sola iteracion: abrir primer registro pendiente.
4. El ejecutor actua y verifica que entra en detalle.
5. Si aparece "Firmar", se pausa por accion irreversible y pide confirmacion.
6. Tras firmar, verifica mensaje/estado y vuelve al listado.
7. Se recaptura pantalla y se decide si quedan registros.
8. Se detiene por condicion de parada, limite de iteraciones, error, ambiguedad o cancelacion del usuario.

No se debe pedir a la IA "haz todo" y ejecutar una lista larga sin reobservacion. La autonomia sale de iterar con evidencias, no de confiar en un plan unico.

### Resultado servido

El usuario puede enriquecer una rutina grabada con instrucciones naturales de navegacion asistida, manteniendo control humano en puntos sensibles.

### Comportamiento actual desplazado

Actualmente todo paso reproducible debe ser una accion DOM concreta. El nuevo camino no sustituye al grabador: anade checkpoints asistidos que expanden instrucciones a acciones validadas durante ejecucion.

### Propietario de verdad

- Rutina y pasos: contrato `shared/routine.schema.json`.
- Configuracion IA y claves: host Java.
- Contexto de pantalla: extension captura, reduce y redacta; host valida politica antes de enviar.
- Ejecucion: maquina de estados y player determinista.

### Frontera de contrato

Nuevos contratos compartidos:

- `ai-config.schema.json`: proveedores, modelos, params, timeouts, limites y fallbacks sin valores secretos en export.
- `ai-navigation-request.schema.json`: instruccion, url, dominio, contexto reducido, acciones permitidas y limites.
- `ai-navigation-proposal.schema.json`: lista de acciones propuestas, bucles controlados, confianza, riesgos y explicacion breve.

### Modelo de paso candidato

```json
{
  "id": "uuid",
  "action": "assist",
  "instruction": "Elegir junio y no firmados, buscar...",
  "allowedActions": ["click", "fill", "select", "check", "wait", "assert"],
  "maxIterations": 1,
  "risk": "medium",
  "confirmationRequired": true,
  "postcondition": { "type": "textVisible", "value": "Resultados" }
}
```

Para bucles:

```json
{
  "action": "assist",
  "instruction": "Entrar en cada registro con lupa, firmar y repetir hasta que no queden registros",
  "maxIterations": 50,
  "stopCondition": "No quedan filas con accion de lupa pendientes",
  "sensitiveActions": ["firmar"],
  "confirmationRequired": true,
  "risk": "irreversible"
}
```

### Reduccion de HTML

Inspirado en `track`, pero adaptado a Rutea:

- parsear DOM con API estructurada, no solo regex;
- eliminar `script`, `style`, `svg`, `canvas`, comentarios, atributos de estilo/eventos, imagenes no necesarias;
- conservar controles interactivos, labels, texto cercano, tablas visibles, botones/enlaces, selects con opciones y mensajes de estado;
- redactar inputs `password`, tokens, cookies, bearer strings, NIF/DNI, emails, telefonos y campos marcados sensibles;
- limitar por presupuesto: primero zona activa/viewport/formulario/tabla relevante; despues texto global truncado;
- calcular hash del contexto reducido para auditoria sin almacenar el HTML completo por defecto.

### Modelo tomado de `elperik/track`

Se adopta:

- catalogo de proveedores/modelos con principal y fallbacks;
- parametros por modelo (`temperature`, max tokens, streaming, timeouts);
- adaptadores OpenAI-compatible y Gemini;
- registro de payload bytes, duracion, respuesta y tokens cuando existan;
- limpieza HTML previa y extraccion de fragmentos estructurados.

No se adopta:

- claves API en `config.php` o en repositorio;
- logs con HTML completo por defecto;
- tecnicas stealth/evasion de navegador;
- prompts que pidan resultados libres sin esquema cerrado.

### Investigacion externa relevante

| Proyecto/documentacion | Aprendizaje para Rutea | Decision |
|---|---|---|
| Browser Use (`github.com/browser-use/browser-use`) | Enfatiza harness de navegador, accion real, dominios permitidos, herramientas persistentes y bucles de recuperacion. | Inspiracion para ciclo agente, no dependencia inicial: es Python/Rust y empuja a autonomia amplia/stealth. |
| Stagehand (`github.com/browserbase/stagehand`) | Buen modelo hibrido: `act`, `extract`, `observe`, `agent`; permite mezclar IA con Playwright y cachear acciones repetibles. | Inspiracion fuerte para nuestras primitivas internas: `observe` = ScreenContext, `act` = propuesta validada, `extract` = lectura estructurada. |
| OpenAI Computer Use | Confirma el patron de modelo que inspecciona UI y devuelve acciones para que un harness las ejecute; recomienda entorno aislado, humano en acciones de impacto y tratar pagina como input no confiable. | Alinear arquitectura, pero no usar acciones de pantalla libres como primer mecanismo. |
| Playwright locators/ARIA snapshots | Los locators por rol/nombre y snapshots ARIA son una representacion semantica util y mas compacta que HTML bruto. | Usar como referencia para Playwright futuro y para disenar el ScreenContext de extension. |
| LangChain4j structured outputs | En Java se puede mapear salida JSON estructurada a POJOs y, cuando el proveedor lo soporte, pedir JSON Schema. | Candidato para Fase 5 si reduce boilerplate; si no, `java.net.http` + validacion JSON Schema propia basta para el primer slice. |

## 8. Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes | Decision |
|---|---|---|---|
| Guardar instrucciones como texto en `description` o `metadata` | Rapido | No validable, dificil de ejecutar, riesgo de deriva | Rechazada |
| Nueva accion `assist` en rutina | Contrato claro, exportable, testeable | Requiere evolucion de esquema y player | Preferida |
| Expandir instruccion a pasos deterministas en tiempo de grabacion | Mas reproducible | La pantalla futura puede variar y aun no hay contexto real de ejecucion | Posponer como optimizacion |
| IA en extension | Menos salto de proceso | Expone claves y politicas a entorno menos privilegiado | Rechazada |
| IA en host | Secretos y politicas centralizados | Requiere nuevos comandos Native Messaging | Preferida |

## 9. Dependencias y librerias

Pendiente de evaluacion en el documento de desarrollo:

| Criterio | Respuesta |
|---|---|
| Problema que resuelve | Cliente HTTP IA, parseo HTML seguro, validacion JSON de propuestas |
| Alternativas | `java.net.http.HttpClient`, SDKs oficiales, jsoup para HTML en host, DOM nativo en extension |
| Licencia | Revisar antes de incorporar |
| Mantenimiento | Revisar actividad y compatibilidad Java 21/MV3 |
| Vulnerabilidades conocidas | Revisar antes de fijar version |
| Dependencias transitivas | Minimizar y encapsular |
| Tamano/arranque | No afectar arranque de extension; host puede asumir mas peso |
| Encapsulacion | Interfaces `AiProvider`, `AiConfigStore`, `ScreenContextReducer` |
| Estrategia de prueba | Fixtures HTML, WireMock/fakes IA, tests de contrato |
| Estrategia de actualizacion | Versiones fijas y lockfiles |

## 10. Plan de implementacion

- [ ] Definir el contrato `ScreenContext`: formularios, controles, tablas, acciones candidatas, redacciones, truncado y hash de contexto.
- [ ] Definir contratos `assist`, `ai-navigation-request` y `ai-navigation-proposal` en `shared/`, con tipos generados y validacion Java.
- [ ] Implementar reduccion/redaccion de contexto en extension con fixtures GPEX anonimizados.
- [ ] Anadir UI minima en panel para insertar/editar instrucciones asistidas durante grabacion.
- [ ] Anadir comandos host `ai.config.get`, `ai.navigation.propose` y configuracion local sin secretos en repo.
- [ ] Implementar adaptador IA con proveedor principal/fallbacks, timeouts y metricas.
- [ ] Integrar ejecucion: al llegar a `assist`, solicitar propuesta, validar, pedir confirmacion si procede y ejecutar acciones generadas.
- [ ] Implementar bucles controlados con maximo de iteraciones y condicion de parada validada.
- [ ] Documentar limites, evidencias, riesgos y ejemplo GPEX.

## 11. Pruebas

- [ ] Unitarias TS: crear paso `assist`, editarlo, export/import, reduccion HTML y redaccion.
- [ ] Unitarias TS: dado un HTML fixture, `ScreenContext` identifica selects de mes/firmadas, boton Buscar y tabla de resultados sin ruido ni secretos.
- [ ] Unitarias Java: leer config IA, validar request/proposal, fallbacks y errores.
- [ ] Contrato: respuestas IA invalidas, acciones desconocidas, dominios no autorizados, campos extra.
- [ ] Integracion: `ai.navigation.propose` con proveedor fake y propuesta determinista.
- [ ] UI/fixtures: instruccion sobre formulario local que elige mes/estado y busca.
- [ ] Seguridad: no aparecen secretos ni valores redactados en storage, export, logs ni payload de prueba.

## 12. Criterios de aceptacion

- CA-001: una rutina puede contener al menos un paso `assist` creado desde la UI de grabacion.
- CA-002: el paso `assist` se valida, exporta e importa sin perder instrucciones ni limites.
- CA-003: el contexto enviado a IA en tests excluye scripts, estilos, secretos y HTML innecesario.
- CA-004: el host rechaza propuestas con acciones fuera de catalogo o dominios no autorizados.
- CA-005: una accion sensible propuesta por IA queda pausada hasta confirmacion explicita.
- CA-006: un bucle asistido se detiene por condicion o por `maxIterations`, nunca indefinidamente.

## 13. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigacion |
|---|---:|---:|---|
| Fuga de datos sensibles a IA | Media | Alta | Redaccion determinista, whitelist de contexto, logs sin payload por defecto |
| Prompt injection desde la pagina | Alta | Alta | Separar contenido de pagina de instrucciones del sistema, salida JSON validada, catalogo cerrado |
| Accion irreversible repetida | Media | Alta | Confirmacion obligatoria y no reintento automatico |
| Coste alto por HTML grande | Media | Media | Reduccion por zona, limite bytes/tokens y metricas |
| Divergencia extension-host | Media | Alta | Contratos compartidos y negociacion de capacidades |
| Ambiguedad en bucles | Alta | Media | Condicion de parada, max iteraciones y pausa ante baja confianza |

## 14. Decisiones y cambios durante el desarrollo

Completar cuando el documento pase a `en_desarrollo`.

## 15. Resultado implementado

Completar al mover a `implementado`.

Commit/PR: Pendiente
Verificacion: Pendiente
Riesgo residual: Pendiente
