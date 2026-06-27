# Análisis inicial de Rutea

## 1. Objetivo

Rutea debe permitir que un usuario grabe y reutilice rutinas sobre webs concretas: navegación, clics, cumplimentación de campos, selección de opciones, esperas, validaciones y confirmaciones.

El producto debe asistir al usuario, no sustituir indiscriminadamente su criterio. La prioridad es que cada ejecución sea explicable, verificable y recuperable.

## 2. Arquitectura inicial

### Extensión Chrome

Tecnología: TypeScript, HTML, CSS y Manifest V3.

Responsabilidades:

- capturar eventos DOM durante la grabación;
- construir descriptores semánticos de los elementos;
- reproducir acciones simples en la pestaña activa;
- resaltar el elemento seleccionado;
- mostrar rutinas, estado, errores y confirmaciones;
- comunicarse con el host local mediante Native Messaging.

### Host local Java

Tecnología: Java 21, Maven y `jpackage`.

Responsabilidades futuras:

- persistencia SQLite;
- cifrado y acceso a secretos del sistema;
- integración con proveedores de IA;
- historial, auditoría y versionado de rutinas;
- acceso controlado a archivos locales;
- automatización complementaria con Playwright Java;
- importación, exportación y copias de seguridad.

La primera base implementa el protocolo Native Messaging y una respuesta de diagnóstico. Persistencia e IA se incorporarán por incrementos.

### Contratos compartidos

Los formatos de rutina y de mensajes deben definirse en `shared/` mediante JSON Schema y versionarse explícitamente. Cualquier modificación incompatible requerirá migración o soporte simultáneo de versiones.

## 3. Decisiones reutilizadas del proyecto intranet

Se reutilizan los principios operativos que han resultado útiles, no los detalles específicos del ERP:

- `AGENTS.md` actúa como router de contexto y no como almacén de análisis extensos;
- documentación canónica separada en una carpeta de análisis;
- agentes especializados para desarrollo, revisión, UI y mantenimiento documental;
- plan breve antes de cambios estructurales;
- inspección de patrones vecinos antes de crear una solución nueva;
- cambios pequeños e incrementales;
- verificación proporcional al riesgo;
- Playwright como prueba principal de flujos visibles;
- salida final diferenciando implementación, pruebas y riesgos no verificados;
- prohibición de copiar credenciales o configuraciones específicas.

No se han trasladado credenciales, empresas, rutas, MCP ni reglas PHP de la intranet porque no pertenecen a Rutea.

## 4. Principio central

El motor determinista ejecuta la rutina. La IA se utilizará únicamente cuando aporte una de estas capacidades:

- convertir una intención del usuario en una propuesta de pasos;
- mapear datos a campos;
- localizar un elemento cuando los selectores guardados han dejado de funcionar;
- interpretar un mensaje de error;
- proponer una reparación que el motor pueda validar.

La salida de IA debe ser estructurada y pertenecer a un catálogo cerrado de acciones. No se ejecutará JavaScript, comandos ni URLs arbitrarias generadas por un modelo.

## 5. Alcance del MVP

Incluido:

- extensión cargable en modo desarrollador;
- panel lateral;
- grabación básica de clics y cambios de campo;
- almacenamiento temporal en `chrome.storage.local`;
- visualización y limpieza de pasos;
- host Java empaquetable;
- prueba de comunicación Native Messaging;
- esquema inicial de rutinas;
- build desde VS Code y CI.

Fuera del primer incremento:

- ejecución autónoma desatendida;
- sincronización en nube;
- varios usuarios;
- marketplace de rutinas;
- evasión de CAPTCHA o segundo factor;
- acciones económicas sin confirmación;
- almacenamiento definitivo de credenciales;
- integración real con modelos de IA.

## 6. Catálogo previsto de acciones

```text
navigate
click
fill
select
check
upload
download
wait
assert
ask_user
```

Cada paso deberá incluir, según proceda:

- identificador y versión;
- URL o patrón de dominio autorizado;
- descriptor semántico del objetivo;
- selectores alternativos;
- valor fijo, variable o secreto referenciado;
- precondición;
- postcondición;
- política de reintento;
- nivel de riesgo;
- necesidad de confirmación.

## 7. Seguridad

Condiciones mínimas:

- lista blanca de dominios;
- permisos de Chrome mínimos;
- claves API y credenciales fuera de la extensión;
- referencias a secretos, nunca el secreto dentro de una rutina exportada;
- redacción de datos antes de enviar contexto a una IA;
- confirmación de acciones irreversibles;
- auditoría de pasos y resultados;
- límites de intentos, tiempo y coste;
- pausa ante CAPTCHA o autenticación adicional;
- no registrar valores de campos de contraseña;
- separación estricta entre logs y `stdout` del host nativo.

## 8. Fases propuestas

1. Consolidar grabador y formato de pasos.
2. Añadir editor de rutinas y variables.
3. Crear reproductor determinista con postcondiciones.
4. Persistir rutinas e historial en SQLite desde Java.
5. Añadir gestión segura de secretos.
6. Incorporar recuperación de selectores asistida por IA.
7. Añadir Playwright Java para flujos que excedan las capacidades de la extensión.
8. Preparar firma, instalador y distribución controlada.

## 9. Riesgos principales

- selectores frágiles y páginas con DOM muy dinámico;
- iframes de terceros y shadow DOM;
- reinicio del service worker de Manifest V3;
- pérdida de contexto entre navegaciones;
- webs que prohíban o detecten automatización;
- exposición involuntaria de datos a modelos externos;
- diferencias entre grabar una acción y verificar su efecto real;
- falsas reparaciones propuestas por IA;
- distribución y actualización coordinada de extensión y host local.

## 10. Criterio de éxito del primer prototipo

En una web local de prueba, el usuario debe poder:

1. abrir el panel de Rutea;
2. iniciar una grabación;
3. realizar varios clics y cambios en campos;
4. detener la grabación;
5. ver pasos con descriptor y URL;
6. limpiar los pasos;
7. obtener respuesta del host Java mediante Native Messaging.
