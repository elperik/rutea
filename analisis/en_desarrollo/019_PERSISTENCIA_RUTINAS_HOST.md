# 019_PERSISTENCIA_RUTINAS_HOST

Estado: En desarrollo
Prioridad: Alta
Responsable: Agente (sesión Claude Code) con supervisión de elperik
Dependencias: `000_ANDAMIAJE_INICIAL`, `003_ARQUITECTURA_Y_LIMITES`, `004_MODELO_DE_RUTINAS_Y_EJECUCION`, `006_LIBRERIAS_Y_HERRAMIENTAS`
Última revisión: 2026-06-28

## 1. Problema

La biblioteca de rutinas vive en `chrome.storage.local`, dentro de la extensión. El doc 003 fija que la fuente de verdad de rutinas e historial debe ser el host. Sin persistencia en el host no hay base para historial, secretos ni copias.

## 2. Objetivo

Primer incremento de la Fase 4: persistir rutinas en SQLite dentro del host Java y exponer operaciones de biblioteca por Native Messaging (`routine.save/list/get/delete`), validando cada rutina contra el contrato antes de guardarla. El cableado de la extensión a estas operaciones se aborda en un slice posterior.

## 3. Alcance

### Incluido

- capa `persistence`: conexión SQLite, inicialización de esquema y `RoutineRepository` (interfaz + implementación SQLite);
- almacenamiento de la rutina como JSON validado, con `id`, `name` y `updatedAt`;
- comandos `routine.save`, `routine.list`, `routine.get`, `routine.delete` en el `MessageHandler`;
- validación de la rutina contra `routine.schema.json` antes de guardar;
- pruebas JUnit del repositorio y de los comandos.

### Excluido

- secretos y Credential Manager (slice siguiente de Fase 4);
- historial de ejecución y artefactos (slice posterior);
- migraciones con Flyway (se usa una inicialización de esquema mínima con versión; Flyway se evaluará al crecer el modelo);
- cableado de la extensión a la persistencia del host (slice posterior);
- backup/restauración.

## 4. Requisitos funcionales

- RF-001: `routine.save` valida la rutina y la inserta o reemplaza por `id`.
- RF-002: `routine.list` devuelve las rutinas almacenadas (resumen: id, name, updatedAt).
- RF-003: `routine.get` devuelve la rutina completa por `id`, o un error si no existe.
- RF-004: `routine.delete` elimina por `id`.
- RF-005: una rutina inválida se rechaza con `VALIDATION_ERROR` y no se persiste.

## 5. Requisitos no funcionales

- RNF-001 (mantenibilidad): el acceso a datos queda tras `RoutineRepository`; la implementación SQLite es sustituible.
- RNF-002 (seguridad): la base se ubica en el perfil del usuario; no se almacenan secretos en esta tabla.
- RNF-003: el esquema se versiona para futuras migraciones.

## 6. Diseño propuesto

- `persistence/Database.java`: abre/crea `rutea.sqlite` bajo el directorio de datos del usuario e inicializa el esquema (tabla `routine`, tabla `schema_version`).
- `persistence/RoutineRepository.java` (interfaz) y `persistence/SqliteRoutineRepository.java`.
- `messaging/MessageHandler`: nuevos `case` para `routine.*` que usan el repositorio y `SchemaValidator`.
- `NativeHostMain`: inyecta el repositorio (ruta de BD configurable; en pruebas, fichero temporal).

## 7. Pruebas

- [x] repositorio: save → get → list → delete (roundtrip) sobre BD temporal (`@TempDir`).
- [x] repositorio: upsert por id reemplaza; lista vacía al inicio.
- [x] handler: `routine.save` válido → ok; inválido → `VALIDATION_ERROR` sin persistir.
- [x] handler: `routine.list`/`get`/`delete` con respuesta conforme a `native-response`.
- [x] end-to-end Native Messaging (mensajes enmarcados): `routine.save` persiste en SQLite y `routine.list` lo devuelve (BD temporal aislada).

17 tests JUnit verdes en local (JDK 21 + Maven).

## 8. Criterios de aceptación

- CA-001: una rutina válida se guarda y se recupera idéntica.
- CA-002: una rutina inválida se rechaza sin persistir.
- CA-003: el listado refleja altas y bajas.
- CA-004: la respuesta de cada comando cumple `native-response`.

## 14. Decisiones y cambios durante el desarrollo

- 2026-06-28: se usa Xerial SQLite JDBC. Se pospone Flyway; la inicialización de esquema es mínima con una tabla de versión, suficiente para una sola tabla.

## 15. Resultado implementado

Completar al mover a `implementado`.

Commit/PR: Pendiente
Verificación: Pendiente
Riesgo residual: Pendiente
