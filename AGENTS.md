# AGENTS.md

Contexto persistente para agentes que trabajen en Rutea.

## Regla principal

Rutea automatiza navegación web potencialmente sensible. Prioriza seguridad, trazabilidad y comportamiento determinista sobre autonomía aparente.

Antes de cambios no triviales:

1. Lee este archivo.
2. Lee `analisis/README.md`.
3. Localiza el documento de iniciativa en `analisis/pendiente`, `analisis/en_desarrollo` o `analisis/implementado`.
4. Lee `analisis/CONVENCIONES_DE_TRABAJO.md` si el cambio afecta arquitectura, contratos, seguridad, dependencias o varios componentes.
5. Inspecciona los archivos afectados y sus contratos vecinos.
6. Expón un plan breve para cambios estructurales.

## Arquitectura acordada

- `extension/`: extensión Chrome Manifest V3 en TypeScript.
- `native-host/`: proceso local Java 21, empaquetado como aplicación de Windows.
- `shared/`: contratos y esquemas JSON compartidos.
- `analisis/`: documentación canónica organizada por estado.
- `.codex/agents/`: agentes especializados.

La extensión captura e interactúa con el DOM. El host Java mantiene secretos, persistencia, acceso local y futuras integraciones con IA. No traslades secretos ni responsabilidades privilegiadas a la extensión.

## Flujo documental obligatorio

```text
analisis/pendiente -> analisis/en_desarrollo -> analisis/implementado
```

- Al comenzar una iniciativa, mueve su documento a `en_desarrollo/`; no lo dupliques.
- Durante el trabajo, registra decisiones duraderas, checklist y pruebas.
- Al terminar, mueve el documento a `implementado/` e incluye commit/PR, evidencia, limitaciones y riesgo residual.
- Usa `analisis/PLANTILLA_TAREA.md` para iniciativas nuevas.
- No declares implementada una capacidad solo porque esté diseñada.

## Principios técnicos

- Automatización determinista primero; IA solo para interpretación, reparación o resolución de ambigüedades.
- La IA nunca debe devolver código arbitrario para ejecutarlo en navegador, Java o sistema operativo.
- Toda acción debe pertenecer a un catálogo cerrado y validado.
- Los mensajes entre extensión y host deben tener versión, tipo y esquema conocido.
- Los pasos deben incluir una postcondición cuando puedan fallar silenciosamente.
- No utilizar coordenadas de pantalla como mecanismo principal.
- Preferir selectores semánticos y múltiples señales.
- No ampliar permisos de Chrome ni `host_permissions` sin justificarlo y documentarlo.
- Nunca almacenar claves API, contraseñas, cookies o tokens en código, Git o `chrome.storage`.
- El host Native Messaging no debe escribir logs en `stdout`.
- Acciones irreversibles o sensibles requieren confirmación explícita.
- CAPTCHA y segundo factor deben pausar la rutina.
- Restringir ejecución por lista de dominios autorizados.

## Dependencias

Se pueden incorporar todas las librerías útiles para el proyecto. No reinventes validadores, migraciones, automatización, criptografía ni utilidades maduras sin motivo.

Antes de añadir una dependencia relevante, evalúa y documenta:

- valor aportado;
- licencia;
- mantenimiento y seguridad;
- dependencias transitivas;
- impacto de tamaño y rendimiento;
- encapsulación y sustitución;
- estrategia de pruebas y actualización.

Consulta `analisis/pendiente/006_LIBRERIAS_Y_HERRAMIENTAS.md`.

## Flujo de trabajo técnico

1. Identifica el componente responsable y evita duplicar lógica entre TypeScript y Java.
2. Revisa `shared/` antes de modificar mensajes o rutinas.
3. Implementa cambios pequeños e incrementales.
4. Añade validaciones en DOM, mensajes, JSON, ficheros y respuestas de IA.
5. Verifica proporcionalmente al riesgo.
6. Mantén actualizado el documento de iniciativa.
7. Si aparece un bloqueo, una hipótesis falsa o un riesgo nuevo, detente, reevalúa y documenta el cambio de enfoque.

## Verificación mínima

Extensión:

```powershell
cd extension
npm install
npm run build
```

Java:

```powershell
cd native-host
mvn -B test package
```

Para UI o navegación, usa Playwright cuando exista un flujo reproducible y revisa consola, permisos, mensajes y almacenamiento.

Para Native Messaging verifica empaquetado, registro, negociación, respuesta, límites de tamaño y ausencia de salida no protocolaria en `stdout`.

## Límites operativos

- No realizar pruebas destructivas en webs reales sin autorización explícita.
- No automatizar evasión de CAPTCHA, antiabuso o restricciones de acceso.
- No introducir telemetría ni envío externo de datos sin decisión documentada.
- No ejecutar migraciones destructivas o eliminar rutinas sin copia o confirmación.
- No asumir que una web permite automatización.
- No introducir una librería con licencia o comportamiento dudoso sin evaluación explícita.

## Formato de respuesta del agente

Al terminar, indicar:

- qué se cambió;
- qué documento cambió de estado;
- qué archivos se tocaron;
- qué pruebas se ejecutaron;
- qué no se pudo verificar;
- decisiones, riesgos y siguiente paso recomendado.
