# Guía de continuidad para el siguiente agente

Última actualización: 2026-06-28

Este documento dice por dónde seguir y cómo probar de forma autónoma. Léelo junto con `AGENTS.md`, `analisis/README.md`, `analisis/ESTADO_DEL_PROYECTO.md` y `analisis/CONVENCIONES_DE_TRABAJO.md`.

## 0. Reglas de seguridad innegociables

- **Nunca** escribas credenciales reales (usuario/contraseña/tokens) en el repositorio, Markdown, código, fixtures, logs ni `chrome.storage`. Si el usuario te las facilita, **no las persistas**.
- El piloto **GPEX** (`intranet.gpex.es`) se prueba con **inicio de sesión manual de la persona** hasta que exista el almacén seguro (siguiente bloque de la Fase 4). Las referencias lógicas a secretos (`secret:gpex.login.username`, `secret:gpex.login.password`) ya están reservadas en `analisis/PROYECTOS.md`; el valor real vive en Windows Credential Manager, nunca en el repo.
- Las **pruebas autónomas se hacen sobre los fixtures locales**, no contra el intranet real. Contra entornos reales: solo lectura o supervisado, y nunca altas/bajas/envíos sin autorización explícita del flujo concreto.

## 1. Estado actual (resumen)

Ciclo grabar → editar → versionar/exportar → ejecutar (supervisado) → persistir (host SQLite) funcionando. Detalle y comandos en `analisis/ESTADO_DEL_PROYECTO.md`. Cobertura: 92 tests TS + 17 Java, CI verde.

Toolchain local (rutas fuera de PATH): JDK 21 en `C:\Program Files\Java\jdk-21.0.10`, Maven en `C:\apache-maven-3.9.16`. Node en PATH.

## 2. Próximos pasos recomendados (en orden)

### 2.1. Cablear la extensión a la persistencia del host (Fase 4)
- La biblioteca del panel debe guardar/leer contra el host (`routine.save/list/get/delete`) cuando esté registrado, con **fallback a `storage.local`** si no lo está.
- Diseño: añadir en el service worker comandos que reenvíen al host por `sendNativeMessage`; el panel detecta disponibilidad del host (vía `hello`) y elige fuente.
- Aceptación: guardar en el panel persiste en SQLite del host; sin host, sigue funcionando en local.

### 2.1b. Navegación asistida con IA (nuevo frente)
- Documento: `analisis/en_desarrollo/020_NAVEGACION_ASISTIDA_IA.md`.
- Objetivo: permitir que el usuario inserte instrucciones asistidas durante la grabación y que, al reproducir, el host pida a una IA una propuesta **estructurada y validada** de acciones del catálogo cerrado.
- Modelo a seguir de `elperik/track`: configuración local de proveedores/modelos con principal y fallbacks, métricas de payload/tokens, timeouts y limpieza agresiva de HTML.
- Diferencias obligatorias en Rutea: claves fuera del repo y de la extensión, sin ejecución de código IA, sin evasiones antiabuso, contexto HTML reducido/redactado y confirmación para acciones sensibles como firmar.
- Primer slice en curso: contratos `assist`, `ScreenContext`, request/proposal y pruebas; después reductor/redactor HTML y UI mínima.

### 2.2. Secretos en Windows Credential Manager (Fase 4)
- Interfaz `SecretStore` en el host; implementación con JNA/DPAPI o Credential Manager. Guardar/leer/borrar por referencia opaca (`secret:...`).
- Resolución de variables secretas en ejecución: el valor del secreto **no pasa por `storage.local` ni se exporta**; el host lo entrega solo en el instante del paso sensible, con confirmación; el player lo escribe sin registrarlo en logs.
- Aceptación: una variable secreta se rellena en el formulario sin que su valor aparezca en almacenamiento, exportaciones ni logs.

### 2.3. Historial de ejecución en el host (Fase 4)
- Tabla `execution` + comandos para registrar inicio/fin/resultados por paso (sin datos sensibles). Reutiliza la máquina de estados (`executor/execution.ts`) como referencia del modelo.

### 2.4. Completar el ejecutor (Fase 3)
- Acción `navigate` y continuidad de ejecución entre documentos (el player ya se reinyecta por origen; falta que el bucle del panel sobreviva a la navegación).
- Reintentos/backoff y recuperación con selectores alternativos.

### 2.5. E2E con Playwright (verificación autónoma de navegador)
- Cargar la extensión empaquetada en un contexto persistente y dirigir la grabación/ejecución sobre los fixtures. El panel lateral es difícil de automatizar; valora dirigir el flujo importando `fixtures/examples/ejemplo-consulta.rutea.json` y ejecutando, o probando los content scripts inyectados.

## 3. Pruebas autónomas (cómo verificar sin intervención humana)

1. **Suite TypeScript**: `npm --prefix extension run lint && npm --prefix extension run typecheck && npm --prefix extension test && npm --prefix extension run build`.
2. **Suite Java** (con JDK 21 + Maven en PATH): `mvn -B -f native-host\pom.xml test package`.
3. **Smoke end-to-end del host** (Native Messaging, BD temporal, sin Chrome):
   ```powershell
   native-host\scripts\smoke-roundtrip.ps1 -JavaHome "C:\Program Files\Java\jdk-21.0.10"
   ```
   Debe imprimir tres respuestas `ok` y `Smoke test OK`.
4. **Ejemplo de rutina**: `fixtures/examples/ejemplo-consulta.rutea.json` es una rutina válida e importable que opera sobre el sitio de fixtures (`localhost`). Sirve como caso de prueba reproducible para grabación/edición/ejecución.

Para nuevas funcionalidades, sigue el patrón establecido: lógica pura en módulos testeables (Vitest/JUnit), validación de contrato en los límites, y verificación proporcional al riesgo antes de declarar nada terminado.

## 4. Flujo de trabajo

- Una rama por slice; iniciativa documentada en `analisis/en_desarrollo/NNN_*.md` (usa `analisis/PLANTILLA_TAREA.md`); mover a `analisis/implementado/` al cerrar, con commit/PR, verificación y riesgo residual.
- No mergear un PR propio sin confirmación explícita del usuario (lo exige el harness).
