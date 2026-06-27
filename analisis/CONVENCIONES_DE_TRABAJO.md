# Convenciones de trabajo para análisis y agentes

## 1. Propósito

Este documento define cómo deben operar los agentes autónomos y los desarrolladores humanos para que análisis, código y pruebas evolucionen de forma coherente.

## 2. Ciclo de vida documental

Cada iniciativa técnica tiene un único documento con identificador estable.

```text
pendiente -> en_desarrollo -> implementado
```

Reglas:

1. No duplicar un documento para cambiarlo de estado; moverlo conservando nombre e identificador.
2. No mover a `en_desarrollo` una iniciativa sin alcance, criterios de aceptación y plan inicial.
3. No mover a `implementado` si faltan pruebas esenciales o si el comportamiento documentado no coincide con el código.
4. Si una iniciativa se cancela, mantenerla en `pendiente` con estado `Descartada` y motivo, o moverla a `implementado` únicamente si la decisión de descarte es una decisión arquitectónica duradera.
5. Si una tarea crece demasiado, dividirla en documentos hijos antes de desarrollar.
6. Los documentos implementados no son un backlog: registran el resultado real y la evidencia.

## 3. Metadatos obligatorios

Todo documento de iniciativa debe comenzar con:

```text
Estado: Pendiente | En desarrollo | Implementado | Bloqueado | Descartado
Prioridad: Crítica | Alta | Media | Baja
Responsable: agente, persona o Sin asignar
Dependencias: identificadores o Ninguna
Última revisión: AAAA-MM-DD
```

Cuando esté implementado debe añadir:

```text
Commit/PR: referencia
Verificación: resumen de pruebas
Riesgo residual: resumen o Ninguno conocido
```

## 4. Preparación de una tarea

Antes de editar código, el agente debe:

1. Leer `AGENTS.md` y `analisis/README.md`.
2. Localizar el documento de iniciativa.
3. Confirmar el estado correcto; si comienza la implementación, moverlo a `en_desarrollo/` en el mismo cambio o commit inicial.
4. Inspeccionar contratos compartidos y código vecino.
5. Identificar límites de confianza, datos sensibles y acciones irreversibles.
6. Definir pruebas antes de realizar cambios de arquitectura o protocolo.
7. Separar explícitamente hechos verificados, hipótesis y decisiones pendientes.

## 5. Trabajo durante el desarrollo

El documento activo debe ser una bitácora técnica útil, no un diario narrativo. Registrar solo decisiones duraderas:

- cambios respecto al plan original;
- contratos creados o modificados;
- librerías adoptadas y motivo;
- incompatibilidades encontradas;
- riesgos nuevos;
- pruebas añadidas;
- pasos de migración o instalación.

No registrar conversaciones, intentos triviales ni detalles que ya sean evidentes en el diff.

## 6. Definición de terminado

Una iniciativa solo puede considerarse implementada cuando:

- el alcance comprometido está completo o las exclusiones están declaradas;
- compila y pasan las pruebas aplicables;
- se han validado los contratos que cruzan límites de proceso;
- se han revisado permisos, secretos y datos sensibles;
- hay evidencia funcional cuando cambia la UI o la navegación;
- la documentación describe el resultado real;
- se han indicado limitaciones y riesgo residual;
- el documento se mueve a `implementado/`.

## 7. Cambios de contrato

Un cambio en JSON Schema, mensajes Native Messaging, formato de rutinas, persistencia o API interna exige:

1. identificar productores y consumidores;
2. decidir compatibilidad hacia atrás;
3. incrementar versión cuando sea incompatible;
4. añadir validación en tiempo de ejecución;
5. añadir pruebas de contrato;
6. documentar migración;
7. evitar despliegues donde extensión y host queden incompatibles sin mecanismo de negociación.

## 8. Política de dependencias

Rutea puede usar cualquier librería que aporte valor real. No se impone una política de “hacer todo a mano”. Antes de incorporar una dependencia, el agente debe evaluar:

- problema concreto que resuelve;
- madurez y mantenimiento;
- licencia y compatibilidad con el modelo de distribución;
- historial de seguridad y frecuencia de actualización;
- tamaño, tiempo de arranque y complejidad añadida;
- dependencias transitivas;
- posibilidad de reemplazo;
- soporte para Java 21, Manifest V3 o el entorno correspondiente;
- pruebas necesarias para encapsularla.

Toda dependencia de infraestructura debe quedar detrás de una interfaz propia cuando exista riesgo razonable de sustitución: proveedores de IA, almacenamiento de secretos, HTTP, automatización avanzada y persistencia.

No fijar versiones “latest”. Usar versiones exactas o rangos controlados mediante lockfiles y herramientas de actualización automatizada.

## 9. Paralelización con agentes

Se pueden ejecutar agentes en paralelo cuando sus ownerships no se solapen. División recomendada:

- extensión y UI;
- host Java y persistencia;
- contratos compartidos;
- pruebas E2E;
- seguridad;
- documentación.

Cada agente debe declarar los archivos que pretende tocar. El agente principal integra cambios de contratos y resuelve conflictos. Dos agentes no deben modificar simultáneamente el mismo esquema o protocolo sin coordinación explícita.

## 10. Evidencia y respuesta final

Al finalizar, informar:

- implementación realizada;
- documentos movidos de estado;
- archivos tocados;
- pruebas ejecutadas y resultado;
- decisiones técnicas;
- partes no verificadas;
- riesgos residuales y siguiente iniciativa recomendada.
