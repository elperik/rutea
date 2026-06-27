# 008_PRIMER_PROYECTO_GPEX

Estado: Pendiente
Prioridad: Alta
Responsable: Sin asignar
Dependencias: `001_PROPUESTA_FUNCIONAL_TECNICA`, `002_PLAN_DESARROLLO_POR_FASES`
Última revisión: 2026-06-27

## Identificación

- Código: `GPEX-001`
- Proyecto: Intranet GPEX
- URL base: `https://intranet.gpex.es/`
- Papel: primer proyecto piloto de Rutea

## Principio de diseño

GPEX será el primer caso real para orientar el desarrollo, pero el núcleo seguirá siendo multiproyecto. Toda particularidad deberá expresarse mediante configuración, políticas o rutinas, nunca mediante lógica hardcodeada en el motor general.

## Seguridad

Los valores de acceso no se almacenan en Git, Markdown, código, fixtures, logs ni almacenamiento de Chrome. El acceso inicial será realizado por el usuario y el futuro host Java utilizará referencias locales a secretos protegidos.

## Objetivos del piloto

- registrar el proyecto y su dominio autorizado;
- estudiar de forma no destructiva los patrones técnicos de la aplicación;
- seleccionar una primera rutina de bajo riesgo;
- grabar navegación y acciones de consulta;
- generar pasos semánticos revisables;
- ejecutar la rutina en modo supervisado;
- detenerse ante ambigüedad o salida del dominio;
- producir diagnóstico sin conservar información sensible;
- trasladar al núcleo solo capacidades reutilizables por otros proyectos.

## Primera rutina

Se elegirá después del reconocimiento técnico. Debe ser repetitiva, verificable y de bajo riesgo. Se priorizarán navegación, filtros, consultas, apertura de registros en lectura o descargas expresamente autorizadas. No se utilizará como primer piloto una operación irreversible.

## Plan

- [ ] crear el modelo general `Project`;
- [ ] asociar dominios autorizados a cada proyecto;
- [ ] definir políticas por proyecto;
- [ ] realizar el reconocimiento técnico de GPEX;
- [ ] seleccionar la primera rutina;
- [ ] reproducir los patrones técnicos relevantes mediante fixtures locales;
- [ ] reforzar el grabador;
- [ ] validar la grabación sobre el proyecto;
- [ ] implementar ejecución supervisada;
- [ ] documentar resultados, limitaciones y siguiente rutina.

## Criterios de aceptación

- GPEX figura como primer proyecto sin información de acceso en el repositorio;
- el dominio está asociado a `GPEX-001`;
- existe un inventario técnico suficiente para elegir una rutina;
- se graba una rutina de bajo riesgo sin información sensible;
- la rutina se reproduce de forma supervisada;
- una salida del dominio o un objetivo ambiguo detienen la ejecución;
- las mejoras resultantes son reutilizables por futuros proyectos.

## Decisiones pendientes

- primera rutina exacta;
- disponibilidad de entorno o datos de prueba;
- operaciones autorizadas;
- necesidad de carga o descarga de archivos;
- política futura de uso de IA;
- mecanismo definitivo de almacenamiento seguro.
