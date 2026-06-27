# 003_ARQUITECTURA_Y_LIMITES

Estado: Pendiente
Prioridad: Alta
Responsable: Sin asignar
Dependencias: `001_PROPUESTA_FUNCIONAL_TECNICA`
Última revisión: 2026-06-27

## 1. Objetivo arquitectónico

Separar capacidades según privilegio y ciclo de vida para que la extensión permanezca ligera, el host proteja recursos locales y el dominio sea independiente de proveedores.

## 2. Componentes

### Extensión Chrome

Subcomponentes propuestos:

- `content/recorder`: captura y normaliza eventos;
- `content/player`: ejecuta acciones DOM autorizadas;
- `content/selector`: genera y resuelve descriptores;
- `background`: coordina pestañas, navegación, sesiones y Native Messaging;
- `sidepanel`: UI de usuario;
- `storage`: caché y estado efímero;
- `contracts`: tipos generados o compartidos.

No debe contener claves API ni acceso directo a bases de datos o secretos del sistema.

### Host Java

Capas propuestas:

```text
application/      casos de uso y orquestación
domain/           modelos y reglas sin infraestructura
messaging/        protocolo Native Messaging
persistence/      SQLite y migraciones
security/         secretos, redacción y políticas
ai/               adaptadores de proveedores
browser/          Playwright y capacidades avanzadas
diagnostics/      logs, métricas y artefactos
configuration/    configuración local versionada
```

### Contratos compartidos

Deben cubrir:

- sobre de mensaje;
- negociación de versión;
- comandos y respuestas;
- errores estructurados;
- rutina, sitio, variable y paso;
- ejecución y resultado;
- capacidades soportadas;
- eventos de progreso;
- solicitudes de confirmación.

## 3. Flujo principal

```text
Usuario
  -> Side panel
  -> Background service worker
  -> Content script / DOM
  -> Native Messaging
  -> Aplicación Java
  -> Persistencia / secretos / IA / Playwright
```

Toda frontera valida entrada y salida. La extensión no confía en mensajes del host solo por ser local; el host no confía en mensajes de la extensión solo por estar autorizada.

## 4. Sobre de mensaje propuesto

```json
{
  "protocolVersion": 1,
  "messageId": "uuid",
  "type": "routine.execute",
  "timestamp": "2026-06-27T18:00:00Z",
  "correlationId": "uuid-opcional",
  "payload": {},
  "meta": {
    "extensionVersion": "0.1.0",
    "hostVersion": "0.1.0"
  }
}
```

La respuesta debe conservar `messageId` o usar `correlationId`, incluir `ok`, código de error estable y detalle seguro para usuario y diagnóstico.

## 5. Negociación de capacidades

Al conectar:

1. la extensión envía versión y capacidades requeridas;
2. el host devuelve versiones de protocolo soportadas y capacidades;
3. ambos acuerdan la versión mayor compatible;
4. si no existe compatibilidad, no se ejecutan comandos de negocio;
5. la UI muestra instrucciones de actualización.

## 6. Estado y persistencia

- Estado efímero de UI y pestaña: extensión.
- Fuente de verdad de sitios, rutinas, versiones e historial: host Java.
- Estado de ejecución: host, con proyección mínima a la extensión.
- Artefactos grandes: sistema de archivos gestionado por el host.
- Secretos: almacén seguro de Windows, referenciados por identificador.

## 7. Concurrencia

Debe definirse:

- una sesión por pestaña o contexto;
- bloqueo optimista de versiones de rutina;
- cancelación mediante token o identificador de ejecución;
- serialización de acciones sobre una misma pestaña;
- límites de ejecuciones paralelas;
- comportamiento cuando Chrome reinicia el service worker;
- recuperación cuando el host se reinicia.

## 8. Errores

Taxonomía mínima:

- `VALIDATION_ERROR`;
- `UNSUPPORTED_PROTOCOL`;
- `UNSUPPORTED_CAPABILITY`;
- `DOMAIN_NOT_ALLOWED`;
- `TARGET_NOT_FOUND`;
- `AMBIGUOUS_TARGET`;
- `PRECONDITION_FAILED`;
- `POSTCONDITION_FAILED`;
- `CONFIRMATION_REQUIRED`;
- `USER_CANCELLED`;
- `TIMEOUT`;
- `SECRET_UNAVAILABLE`;
- `AI_PROVIDER_ERROR`;
- `PERSISTENCE_ERROR`;
- `INTERNAL_ERROR`.

Los mensajes al usuario no deben incluir stack traces, tokens, rutas sensibles o fragmentos de DOM sin redactar.

## 9. Interfaces de sustitución

Crear interfaces propias para:

- `RoutineRepository`;
- `ExecutionRepository`;
- `SecretStore`;
- `AiProvider`;
- `BrowserAutomationEngine`;
- `ArtifactStore`;
- `Clock` e identificadores para pruebas;
- `DomainPolicy`;
- `RedactionService`.

No crear interfaces triviales sin sustitución o aislamiento real.

## 10. Decisiones pendientes

- transporte de eventos largos: mensajes discretos o puerto persistente;
- validación JSON compartida y generación de tipos;
- framework de UI o TypeScript sin framework;
- WXT frente a estructura Manifest V3 manual;
- SQLite síncrono mediante JDBC y política de hilos;
- formato de artefactos y retención;
- estrategia exacta de migración de rutinas;
- ubicación de configuración y datos por usuario.

## 11. Criterios de aceptación

- límites de responsabilidad aprobados;
- protocolo inicial especificado y probado;
- fuente de verdad de cada dato definida;
- estrategia de concurrencia y reinicio definida;
- errores estructurados;
- dependencias externas encapsuladas donde aporte valor.
