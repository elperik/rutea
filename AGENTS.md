# AGENTS.md

Contexto persistente para agentes que trabajen en Rutea.

## Regla principal

Rutea automatiza navegación web potencialmente sensible. Prioriza siempre seguridad, trazabilidad y comportamiento determinista sobre autonomía aparente.

Antes de cambios no triviales:

1. Lee este archivo.
2. Lee `analisis/README.md`.
3. Inspecciona los archivos afectados y sus contratos vecinos.
4. Expón un plan breve si el cambio afecta arquitectura, permisos de Chrome, protocolo Native Messaging, formato de rutinas, seguridad, almacenamiento o integración con IA.

## Arquitectura acordada

- `extension/`: extensión Chrome Manifest V3 en TypeScript.
- `native-host/`: proceso local Java 21, empaquetado como aplicación de Windows.
- `shared/`: contratos y esquemas JSON compartidos.
- `analisis/`: documentación canónica de alcance, decisiones y riesgos.
- `.codex/agents/`: agentes especializados.

La extensión captura e interactúa con el DOM. El host Java mantiene secretos, persistencia, acceso local y futuras integraciones con IA. No traslades secretos ni responsabilidades privilegiadas a la extensión.

## Principios técnicos

- Automatización determinista primero; IA solo para interpretación, reparación o resolución de ambigüedades.
- La IA nunca debe devolver JavaScript arbitrario para ejecutarlo en una página.
- Toda acción debe pertenecer a un catálogo cerrado y validado.
- Los mensajes entre extensión y host deben tener versión, tipo y esquema conocido.
- Los pasos deben incluir una condición posterior verificable cuando la acción pueda fallar silenciosamente.
- No utilizar coordenadas de pantalla como mecanismo principal.
- Preferir selectores semánticos: rol, nombre accesible, etiqueta, `data-testid`, `name` y selectores alternativos.
- No ampliar permisos de Chrome ni `host_permissions` sin justificarlo y documentar el impacto.
- Nunca almacenar claves API, contraseñas, cookies o tokens en el código, el repositorio o `chrome.storage`.
- El host Native Messaging no debe escribir logs en `stdout`; ese canal está reservado al protocolo. Usar `stderr` o ficheros controlados.
- Acciones irreversibles o sensibles —enviar, borrar, pagar, facturar, aceptar o publicar— requieren confirmación explícita.
- CAPTCHA y segundo factor deben pausar la rutina y solicitar intervención humana.
- Restringir ejecución por lista de dominios autorizados.

## Flujo de trabajo

1. Identifica el componente responsable y evita duplicar lógica entre TypeScript y Java.
2. Revisa el esquema de `shared/` antes de modificar mensajes o rutinas.
3. Implementa cambios pequeños e incrementales.
4. Añade validaciones en los límites: DOM, mensajes nativos, JSON, ficheros y respuestas de IA.
5. Verifica proporcionalmente al riesgo.
6. Actualiza `analisis/README.md` solo si cambia una decisión duradera, un contrato o la operativa del proyecto.

No crees documentos temporales, listas de tareas permanentes ni análisis duplicados por defecto. `AGENTS.md` debe actuar como router; la explicación extensa pertenece a `analisis/`.

## Verificación mínima

Para cambios en la extensión:

```powershell
cd extension
npm install
npm run build
```

Para cambios en Java:

```powershell
cd native-host
mvn -B test package
```

Para cambios de interfaz o navegación, añade o ejecuta pruebas Playwright cuando exista un flujo reproducible. Revisa además errores de consola, permisos, mensajes y almacenamiento.

Para Native Messaging, verifica:

- empaquetado con `scripts/package-app.ps1`;
- registro del host con `scripts/register-chrome-host.ps1`;
- respuesta del botón de diagnóstico del panel lateral;
- ausencia de salida no protocolaria en `stdout`.

## Límites operativos

- No realizar pruebas destructivas en webs reales sin autorización explícita.
- No automatizar evasión de CAPTCHA, controles antiabuso o restricciones de acceso.
- No introducir telemetría ni envío de datos externos sin decisión documentada.
- No ejecutar migraciones destructivas o eliminar rutinas sin copia o confirmación.
- No asumir que una web permite automatización; registrar el dominio y la autorización de uso.

## Formato de respuesta del agente

Al terminar, indicar de forma concisa:

- qué se cambió;
- qué archivos se tocaron;
- qué pruebas se ejecutaron;
- qué no se pudo verificar;
- riesgos o decisiones pendientes, si existen.
