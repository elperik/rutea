# 000_ANDAMIAJE_INICIAL

Estado: Implementado
Prioridad: Alta
Responsable: Inicialización del proyecto
Dependencias: Ninguna
Última revisión: 2026-06-27

Commit/PR: `677af0336e0cc3eef44d01e4db932b382368b28b`
Verificación: compilación TypeScript y Java; prueba básica del protocolo Native Messaging
Riesgo residual: falta validación funcional completa cargando extensión y host empaquetado en Chrome sobre Windows

## 1. Resultado entregado

Se creó una base de proyecto preparada para Visual Studio Code con:

- extensión Chrome Manifest V3 en TypeScript;
- panel lateral;
- grabador básico de clics y cambios;
- almacenamiento provisional en `chrome.storage.local`;
- host local Java 21;
- protocolo Native Messaging mínimo;
- scripts PowerShell de empaquetado y registro;
- esquema JSON inicial de rutinas;
- tareas de VS Code y CI;
- agentes de Codex para desarrollo, revisión, UI y documentación.

## 2. Componentes principales

### Extensión

- `extension/static/manifest.json`
- `extension/src/background/service-worker.ts`
- `extension/src/content/recorder.ts`
- `extension/src/sidepanel/main.ts`

### Host Java

- `native-host/pom.xml`
- `native-host/src/main/java/es/etic/rutea/NativeHostMain.java`
- `native-host/scripts/package-app.ps1`
- `native-host/scripts/register-chrome-host.ps1`

### Contratos

- `shared/routine.schema.json`

## 3. Comportamiento actual

El usuario puede abrir el panel, iniciar la inyección del grabador en la pestaña activa, registrar clics y cambios en determinados controles, detener la grabación, visualizar los pasos y eliminarlos.

El botón de diagnóstico puede enviar un mensaje al host `es.etic.rutea` cuando esté empaquetado y registrado. El host responde con un mensaje JSON versionado.

## 4. Limitaciones

- el grabador no conserva estado de forma robusta tras todas las navegaciones;
- no existe editor de rutinas;
- no existe reproductor;
- no existe persistencia SQLite;
- no existe gestión de secretos;
- no hay integración con IA;
- no hay pruebas E2E automatizadas de la extensión;
- el esquema compartido todavía no se valida en tiempo de ejecución;
- el host no interpreta comandos de negocio.

## 5. Trabajo que depende de este andamiaje

Las iniciativas `001` a `007` de `analisis/pendiente/` desarrollan el producto sobre esta base.
