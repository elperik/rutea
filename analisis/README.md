# Análisis y evolución de Rutea

Esta carpeta es la fuente canónica para el análisis funcional, técnico y operativo de Rutea. Su objetivo no es acumular notas, sino permitir que desarrolladores y agentes autónomos entiendan rápidamente qué está decidido, qué se está construyendo, qué falta y con qué evidencia se considera terminado.

## Estructura por estado

```text
analisis/
├── pendiente/       Trabajo analizado pero aún no iniciado
├── en_desarrollo/   Trabajo activo y con alcance comprometido
├── implementado/    Trabajo terminado, verificado y trazable
├── CONVENCIONES_DE_TRABAJO.md
└── PLANTILLA_TAREA.md
```

### `pendiente/`

Contiene propuestas, decisiones abiertas, diseños y fases todavía no iniciadas. Un documento pendiente puede ser amplio, pero debe identificar claramente:

- problema y objetivo;
- alcance y exclusiones;
- decisiones propuestas y alternativas;
- dependencias;
- riesgos;
- criterios de aceptación;
- orden recomendado de ejecución.

### `en_desarrollo/`

Solo debe contener iniciativas que estén siendo implementadas. Al iniciar un trabajo se mueve el mismo archivo desde `pendiente/`; no se crea una copia.

El documento debe actualizarse con:

- alcance exacto comprometido;
- plan de implementación;
- archivos o componentes afectados;
- decisiones tomadas durante el desarrollo;
- checklist de avance;
- pruebas previstas y ejecutadas;
- bloqueos o cambios de alcance.

### `implementado/`

Contiene la memoria técnica de funcionalidades concluidas. El documento se mueve desde `en_desarrollo/` cuando se cumplen los criterios de aceptación y debe registrar:

- comportamiento realmente entregado;
- archivos y contratos principales;
- commit o PR relacionado;
- pruebas y evidencias;
- migraciones o pasos de instalación;
- limitaciones conocidas;
- deuda técnica y trabajo posterior.

## Documentos principales pendientes

1. [`pendiente/001_PROPUESTA_FUNCIONAL_TECNICA.md`](pendiente/001_PROPUESTA_FUNCIONAL_TECNICA.md): visión profunda del producto y características básicas.
2. [`pendiente/002_PLAN_DESARROLLO_POR_FASES.md`](pendiente/002_PLAN_DESARROLLO_POR_FASES.md): orden de construcción, entregables y criterios de salida.
3. [`pendiente/003_ARQUITECTURA_Y_LIMITES.md`](pendiente/003_ARQUITECTURA_Y_LIMITES.md): componentes, responsabilidades y flujos de datos.
4. [`pendiente/004_MODELO_DE_RUTINAS_Y_EJECUCION.md`](pendiente/004_MODELO_DE_RUTINAS_Y_EJECUCION.md): dominio, estados, selectores, variables y postcondiciones.
5. [`pendiente/005_SEGURIDAD_PRIVACIDAD_Y_PERMISOS.md`](pendiente/005_SEGURIDAD_PRIVACIDAD_Y_PERMISOS.md): amenazas, controles y tratamiento de secretos.
6. [`pendiente/006_LIBRERIAS_Y_HERRAMIENTAS.md`](pendiente/006_LIBRERIAS_Y_HERRAMIENTAS.md): catálogo inicial y política abierta de dependencias.
7. [`pendiente/007_ESTRATEGIA_DE_PRUEBAS.md`](pendiente/007_ESTRATEGIA_DE_PRUEBAS.md): pruebas unitarias, integración, extensión, navegador y seguridad.

## Estado ya implementado

- [`implementado/000_ANDAMIAJE_INICIAL.md`](implementado/000_ANDAMIAJE_INICIAL.md): andamiaje inicial del proyecto.
- [`implementado/009_CIERRE_FASE_0.md`](implementado/009_CIERRE_FASE_0.md): cierre de la Fase 0 (contratos validados en ambos lados, tipos y validadores generados, fixtures y primera suite de pruebas).
- [`implementado/010_GRABADOR_SESION_Y_SELECTORES.md`](implementado/010_GRABADOR_SESION_Y_SELECTORES.md): grabador con sesión persistente, permiso por sitio, selectores explicados, dedup y redacción.
- [`implementado/011_CONTINUIDAD_ENTRE_NAVEGACIONES.md`](implementado/011_CONTINUIDAD_ENTRE_NAVEGACIONES.md): continuidad de grabación entre navegaciones dentro del origen autorizado.
- [`implementado/012_RUTINA_Y_BIBLIOTECA.md`](implementado/012_RUTINA_Y_BIBLIOTECA.md): grabación → rutina validada, biblioteca y export/import sin secretos.
- [`implementado/013_EDITOR_DE_PASOS.md`](implementado/013_EDITOR_DE_PASOS.md): editor de pasos (reordenar, eliminar, riesgo/confirmación/timeout, renombrar).
- [`implementado/014_VERSIONADO_E_INTEGRIDAD.md`](implementado/014_VERSIONADO_E_INTEGRIDAD.md): sobre de exportación con hash SHA-256 y verificación de integridad al importar.
- [`implementado/015_VARIABLES.md`](implementado/015_VARIABLES.md): variables de rutina (extracción, gestión, resolución) y su edición. Cierra la Fase 2.

## Orden de lectura para agentes

Para una tarea ordinaria:

1. `AGENTS.md`.
2. Este índice.
3. El documento de la iniciativa en su carpeta de estado.
4. Los documentos temáticos enlazados por esa iniciativa.
5. Los archivos de código afectados y sus vecinos.

Para arquitectura, seguridad, contratos o cambios multi-componente, leer además `CONVENCIONES_DE_TRABAJO.md` antes de editar.

## Principios no negociables

- Motor determinista primero; IA como asistencia restringida.
- Contratos versionados entre extensión, host y futuros proveedores.
- Permisos mínimos y secretos fuera de la extensión.
- Acciones sensibles con confirmación y auditoría.
- Ningún trabajo se considera terminado sin verificación proporcional al riesgo.
- La documentación refleja el sistema real; no se documentan capacidades inexistentes como si estuvieran implementadas.
