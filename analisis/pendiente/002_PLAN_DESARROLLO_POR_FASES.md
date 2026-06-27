# 002_PLAN_DESARROLLO_POR_FASES

Estado: Pendiente
Prioridad: Alta
Responsable: Sin asignar
Dependencias: `001_PROPUESTA_FUNCIONAL_TECNICA`
Última revisión: 2026-06-27

## 1. Estrategia

El desarrollo se divide en incrementos verticales verificables. Cada fase debe producir una capacidad demostrable y no únicamente infraestructura interna.

No se comenzará una fase dependiente mientras existan contratos fundamentales sin estabilizar. Las fases pueden solaparse solo cuando los ownerships sean independientes.

## 2. Fase 0 — Base y gobierno técnico

### Objetivo

Estabilizar estructura, herramientas, documentación y contratos mínimos.

### Entregables

- convenciones de análisis por estado;
- build reproducible;
- lint y formato;
- CI;
- versionado de extensión y host;
- negociación básica de protocolo;
- validación de JSON Schema;
- web local de pruebas;
- primera suite unitaria.

### Criterios de salida

- un clon limpio compila con un único comando;
- CI valida extensión y Java;
- extensión y host rechazan mensajes inválidos;
- existe una página de fixtures para pruebas.

## 3. Fase 1 — Grabador robusto

### Objetivo

Capturar acciones relevantes y convertirlas en pasos semánticos estables.

### Entregables

- estado de grabación persistente por pestaña;
- navegación y cambios de documento;
- soporte básico de iframes accesibles y shadow DOM abierto;
- deduplicación de eventos;
- selectores múltiples ordenados por calidad;
- redacción de campos sensibles;
- resaltado del elemento;
- normalización de acciones;
- pruebas sobre fixtures dinámicos.

### Criterios de salida

- grabar una rutina de diez pasos sin duplicados;
- reiniciar panel o service worker sin perder la sesión;
- no registrar valores de contraseña;
- explicar cada selector generado.

## 4. Fase 2 — Dominio, biblioteca y editor

### Objetivo

Convertir una secuencia grabada en una rutina mantenible.

### Entregables

- modelos versionados de sitio, rutina, versión, variable y paso;
- biblioteca de rutinas;
- editor de pasos;
- variables y conjuntos de entrada;
- validación de dominio y riesgo;
- exportación/importación;
- migraciones de esquema.

### Criterios de salida

- crear una rutina desde grabación;
- editar y validar;
- exportar sin secretos;
- importar y conservar versión;
- detectar un fichero incompatible o manipulado.

## 5. Fase 3 — Ejecutor determinista

### Objetivo

Ejecutar rutinas con control de estado, verificaciones y recuperación local.

### Entregables

- máquina de estados de ejecución;
- catálogo cerrado de acciones;
- precondiciones y postcondiciones;
- timeouts, reintentos y cancelación;
- confirmaciones;
- modo paso a paso y supervisado;
- resultados estructurados;
- recuperación con selectores alternativos;
- checkpoints.

### Criterios de salida

- ejecutar de principio a fin una rutina sobre fixtures;
- detener, reanudar y cancelar;
- fallar de forma explícita cuando la postcondición no se cumple;
- no ejecutar una acción irreversible sin confirmación.

## 6. Fase 4 — Persistencia, historial y secretos

### Objetivo

Trasladar la fuente de verdad al host local y proteger datos sensibles.

### Entregables

- SQLite;
- migraciones;
- repositorios y transacciones;
- historial y artefactos;
- almacén seguro de secretos de Windows;
- políticas de retención;
- backup y restauración;
- redacción de logs.

### Criterios de salida

- reiniciar extensión y host conservando rutinas e historial;
- recuperar una copia;
- demostrar que una exportación no contiene secretos;
- comprobar que logs y base no almacenan contraseñas.

## 7. Fase 5 — Asistencia de IA

### Objetivo

Añadir IA sin reducir seguridad ni determinismo.

### Entregables

- interfaz `AiProvider`;
- proveedores configurables;
- salida estructurada validada;
- reducción y redacción de contexto;
- clasificación de candidatos;
- reparación propuesta de selectores;
- límites de coste, latencia y reintento;
- trazabilidad de cada intervención.

### Criterios de salida

- la aplicación funciona sin IA;
- una respuesta inválida se rechaza sin actuar;
- el usuario puede inspeccionar y aprobar una reparación;
- se registra proveedor, modelo, coste aproximado y decisión final sin almacenar datos sensibles.

## 8. Fase 6 — Playwright Java y flujos avanzados

### Objetivo

Resolver navegación compleja que no sea adecuada para un content script.

### Entregables

- motor Playwright detrás de una interfaz;
- perfiles aislados;
- descargas y cargas avanzadas;
- múltiples páginas;
- trazas y capturas redactadas;
- selección de motor por capacidad;
- compatibilidad de resultados con el ejecutor principal.

### Criterios de salida

- ejecutar una misma rutina compatible mediante extensión o Playwright;
- mantener semántica y auditoría equivalentes;
- no usar el perfil personal del usuario por defecto.

## 9. Fase 7 — Empaquetado, actualización y endurecimiento

### Objetivo

Convertir el prototipo en una aplicación instalable y mantenible.

### Entregables

- instalador Windows;
- firma de código cuando proceda;
- instalación y desinstalación del host;
- coordinación de versiones;
- actualización segura;
- diagnóstico redactado;
- políticas de retención;
- revisión de dependencias y amenazas.

### Criterios de salida

- instalación limpia reproducible;
- desinstalación sin residuos sensibles;
- detección de incompatibilidad extensión-host;
- actualización con rollback o recuperación documentada.

## 10. Fase 8 — Evoluciones opcionales

- Edge y otros Chromium;
- sincronización cifrada;
- equipos y roles;
- ejecución programada de bajo riesgo;
- catálogo privado de rutinas;
- RAG con documentación de sitios;
- conectores de datos;
- automatización de escritorio separada;
- telemetría opcional y anonimizada.

## 11. Trabajo recomendado inmediato

Primer bloque de desarrollo:

1. adoptar validación runtime para mensajes y rutinas;
2. crear fixtures web locales;
3. añadir pruebas unitarias y E2E mínimas;
4. estabilizar el estado de grabación;
5. generar descriptores y selectores múltiples;
6. diseñar máquina de estados del ejecutor antes de implementar reproducción.

## 12. Regla de paso entre fases

Una fase no se cierra por porcentaje de tareas. Se cierra cuando todos sus criterios de salida están respaldados por pruebas o evidencia reproducible y su documento se mueve a `implementado/`.
