# 007_ESTRATEGIA_DE_PRUEBAS

Estado: Pendiente
Prioridad: Alta
Responsable: Sin asignar
Dependencias: `003_ARQUITECTURA_Y_LIMITES`, `004_MODELO_DE_RUTINAS_Y_EJECUCION`, `005_SEGURIDAD_PRIVACIDAD_Y_PERMISOS`
Última revisión: 2026-06-27

## 1. Objetivo

Construir una pirámide de pruebas que detecte errores de dominio rápidamente y reserve el navegador real para flujos que verdaderamente lo requieren.

## 2. Niveles

### Unitarias TypeScript

Cubrir:

- normalización de eventos;
- generación y puntuación de selectores;
- redacción;
- evaluación segura de variables;
- estados de UI;
- validación de mensajes;
- políticas de dominio y riesgo.

### Unitarias Java

Cubrir:

- lectura y escritura Native Messaging;
- validación de contratos;
- máquina de estados;
- políticas de confirmación y reintento;
- repositorios mediante dobles o SQLite temporal;
- redacción;
- proveedores de IA simulados;
- errores y negociación de capacidades.

### Contrato

Cada esquema compartido debe tener casos:

- válido mínimo;
- válido completo;
- campo obligatorio ausente;
- campo desconocido;
- versión incompatible;
- tamaño excesivo;
- tipo incorrecto;
- contenido sensible prohibido.

Los mismos fixtures deberían validarse desde TypeScript y Java.

### Integración

- extensión ↔ host real;
- host ↔ SQLite;
- migraciones desde versiones previas;
- host ↔ proveedor HTTP simulado;
- exportación/importación;
- almacenamiento de secretos mediante implementación de prueba.

### E2E de extensión

Usar Chromium persistente con la extensión cargada y páginas fixture controladas.

Flujos mínimos:

1. abrir panel;
2. comenzar grabación;
3. interactuar con formulario;
4. detener;
5. comprobar pasos;
6. editar;
7. ejecutar;
8. confirmar acción sensible;
9. verificar postcondición;
10. revisar historial.

### E2E Playwright Java

Cuando se incorpore el motor avanzado, probar navegación, descargas, múltiples pestañas, perfiles y trazas.

## 3. Sitio de fixtures

Crear una aplicación web local dedicada a pruebas con:

- formularios básicos;
- labels y ARIA;
- IDs dinámicos;
- listas que reordenan elementos;
- shadow DOM abierto;
- iframe mismo origen y externo simulado;
- navegación SPA;
- modal;
- mensajes de éxito y error;
- descarga y carga;
- acción irreversible simulada;
- CAPTCHA ficticio que debe causar pausa;
- elementos ambiguos.

Los fixtures deben ser deterministas y versionados.

## 4. Matriz de navegadores

Inicial:

- Chrome estable en Windows;
- Chromium de Playwright en CI para la mayoría de flujos.

Posterior:

- Edge estable;
- versiones mínimas soportadas;
- pruebas de actualización de extensión y host.

## 5. Pruebas de resiliencia

- reinicio del service worker;
- cierre de panel;
- recarga y navegación de pestaña;
- desconexión del host;
- reinicio del host;
- timeout de IA;
- base bloqueada;
- fichero corrupto;
- versión incompatible;
- cancelación durante espera;
- recuperación desde checkpoint.

## 6. Pruebas de seguridad

- permisos y dominios;
- payloads hostiles;
- HTML y nombres maliciosos;
- secretos ausentes en logs;
- prompt injection en contenido de página;
- rutas de archivo manipuladas;
- importaciones no confiables;
- acciones irreversibles sin confirmación;
- mensajes Native Messaging sobredimensionados.

## 7. Calidad estática

TypeScript:

- compilación estricta;
- ESLint;
- formato;
- dependencias vulnerables.

Java:

- compilación con warnings controlados;
- SpotBugs;
- formato o Checkstyle;
- Dependency-Check;
- cobertura de dominio.

## 8. CI propuesta

Jobs separados:

1. contratos;
2. extensión: lint, typecheck, unitarias, build;
3. Java: test, análisis estático, package;
4. integración Native Messaging;
5. E2E Chromium;
6. seguridad de dependencias;
7. empaquetado Windows en releases o ejecución programada.

Publicar como artefactos solo trazas y capturas redactadas de fallos.

## 9. Criterios de aceptación

- pruebas unitarias rápidas para dominio;
- fixtures compartidos de contratos;
- E2E reproducible de grabación y ejecución;
- fallos de seguridad cubiertos;
- CI bloquea merge ante build o pruebas esenciales fallidas;
- evidencia accesible sin secretos.
