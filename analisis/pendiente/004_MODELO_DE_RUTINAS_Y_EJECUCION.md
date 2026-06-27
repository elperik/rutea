# 004_MODELO_DE_RUTINAS_Y_EJECUCION

Estado: Pendiente
Prioridad: Alta
Responsable: Sin asignar
Dependencias: `003_ARQUITECTURA_Y_LIMITES`
Última revisión: 2026-06-27

## 1. Agregados principales

### Site

Representa una web o familia de dominios autorizados.

Campos mínimos:

- `id`;
- `name`;
- `allowedOrigins`;
- `startUrl`;
- `enabled`;
- `privacyPolicy`;
- `defaultTimeouts`;
- `confirmationPolicy`;
- `createdAt`, `updatedAt`.

### Routine

Identidad lógica de una rutina.

- `id`;
- `siteId`;
- `name`;
- `description`;
- `tags`;
- `status`;
- `currentVersionId`.

### RoutineVersion

Contenido inmutable de una versión ejecutable.

- versión de esquema;
- número de versión;
- variables;
- pasos;
- compatibilidad mínima;
- hash de integridad;
- autor y motivo del cambio;
- fecha.

### Execution

Instancia de una ejecución.

- rutina y versión;
- parámetros;
- estado;
- contexto de pestaña o navegador;
- timestamps;
- índice actual;
- resultados;
- confirmaciones;
- artefactos;
- resumen final.

## 2. Estados de rutina

```text
draft -> validated -> active -> archived
                    -> disabled
```

Solo una versión validada puede activarse. Una versión activa no se modifica: cualquier cambio crea otra versión.

## 3. Estados de ejecución

```text
created
  -> validating
  -> waiting_for_context
  -> running
  -> waiting_for_confirmation
  -> waiting_for_user
  -> recovering
  -> paused
  -> completed
  -> failed
  -> cancelled
```

Las transiciones deben ser explícitas y persistidas cuando el host sea fuente de verdad.

## 4. Paso

Campos propuestos:

- `id` estable dentro de la versión;
- `action`;
- `description`;
- `enabled`;
- `target`;
- `valueExpression`;
- `preconditions`;
- `postconditions`;
- `timeoutMs`;
- `retryPolicy`;
- `risk`;
- `confirmationPolicy`;
- `onFailure`;
- `metadata` de grabación.

## 5. Catálogo inicial de acciones

- `navigate`;
- `click`;
- `fill`;
- `select`;
- `check`;
- `uncheck`;
- `upload`;
- `download`;
- `wait`;
- `assert`;
- `extract`;
- `switch_tab`;
- `close_tab`;
- `ask_user`;
- `checkpoint`.

Cada acción debe tener un esquema de payload independiente y validado.

## 6. Descriptor de objetivo

Un objetivo no es un único CSS selector. Debe almacenar señales ordenadas:

- rol accesible;
- nombre accesible;
- etiqueta;
- `data-testid`;
- `id` estable;
- `name`;
- tipo de control;
- texto visible normalizado;
- atributos relevantes;
- selectores CSS alternativos;
- ruta de frame;
- ruta de shadow roots;
- contexto cercano;
- huella estructural opcional.

No almacenar el DOM completo de forma permanente salvo diagnóstico explícito y redactado.

## 7. Estrategia de resolución

Cada candidato recibe puntuación por señales. Deben existir umbrales diferenciados:

- coincidencia segura: ejecutar;
- coincidencia probable: resaltar o pedir confirmación según riesgo;
- ambigua: no ejecutar;
- inexistente: iniciar recuperación.

La puntuación y las señales usadas deben quedar en el resultado del paso.

## 8. Variables y expresiones

Sintaxis recomendada de referencia:

```text
{{cliente.nombre}}
{{fecha_factura}}
{{secret:portal.password}}
```

Las expresiones deben evaluarse con un motor restringido, sin acceso a clases Java, DOM, sistema de archivos o red.

Tipos:

- string;
- decimal;
- integer;
- boolean;
- date;
- datetime;
- enum;
- fileReference;
- secretReference;
- object;
- array.

## 9. Condiciones

Ejemplos de precondición:

- URL coincide;
- elemento visible;
- texto presente;
- variable definida;
- pestaña activa correcta.

Ejemplos de postcondición:

- URL cambia o coincide;
- elemento aparece o desaparece;
- valor se actualiza;
- mensaje de éxito visible;
- descarga completada;
- respuesta de red compatible;
- estado extraído igual al esperado.

Una acción que puede fallar silenciosamente debe tener postcondición.

## 10. Reintentos e idempotencia

No repetir automáticamente acciones irreversibles. Clasificar acciones:

- seguras e idempotentes;
- potencialmente duplicables;
- irreversibles.

La política incluye máximo de intentos, espera, backoff, errores reintentables y necesidad de reevaluar el objetivo.

## 11. Confirmaciones

La política puede ser:

- nunca;
- cuando el selector no sea exacto;
- siempre para riesgo alto;
- siempre para acción irreversible;
- definida por sitio;
- definida por usuario.

La confirmación debe mostrar acción, destino, valor redactado, motivo y resultado esperado.

## 12. Versionado y reparación

Una reparación no muta silenciosamente una versión activa. Flujo:

1. ejecución falla;
2. se genera propuesta;
3. usuario o política aprueba para esa ejecución;
4. se verifica postcondición;
5. se ofrece guardar como nueva versión;
6. se registra relación con versión anterior.

## 13. Criterios de aceptación

- esquema completo y validable;
- máquina de estados cubierta por pruebas;
- catálogo de acciones con payloads cerrados;
- resolución explicable;
- expresiones seguras;
- acciones sensibles no reintentadas de forma automática;
- reparación versionada.
