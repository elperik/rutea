# 001_PROPUESTA_FUNCIONAL_TECNICA

Estado: Pendiente
Prioridad: Alta
Responsable: Sin asignar
Dependencias: `000_ANDAMIAJE_INICIAL`
Última revisión: 2026-06-27

## 1. Visión

Rutea será un asistente local de navegación capaz de convertir tareas web repetitivas en rutinas grabables, editables y ejecutables. El usuario conserva el control, puede inspeccionar cada paso y recibe confirmación antes de acciones sensibles.

No se plantea como un bot autónomo de propósito general. Su propuesta de valor es automatizar procesos conocidos con comportamiento predecible y utilizar IA únicamente cuando una regla determinista no sea suficiente.

## 2. Usuarios y escenarios

### Usuario individual técnico

Automatiza tareas frecuentes en intranets, ERP, portales de proveedores, administración y backoffice.

### Usuario administrativo

Ejecuta rutinas preparadas por otra persona, suministra variables y confirma pasos delicados sin editar selectores.

### Responsable de proceso

Diseña, valida y versiona rutinas; revisa historial, fallos y cambios de las webs.

### Soporte o desarrollador

Diagnostica fallos mediante trazas, DOM reducido, capturas, logs y versiones de rutina.

## 3. Características básicas

### 3.1 Catálogo de sitios

Cada sitio define:

- nombre y dominios autorizados;
- URL inicial;
- perfil o contexto de navegador;
- permisos requeridos;
- reglas de privacidad;
- política de confirmación;
- límites de tiempo y reintentos;
- notas sobre autorización de automatización.

### 3.2 Biblioteca de rutinas

Debe permitir:

- crear, duplicar, renombrar, archivar y versionar;
- etiquetar por sitio, módulo y finalidad;
- buscar y filtrar;
- exportar e importar sin secretos;
- comparar versiones;
- restaurar una versión anterior;
- identificar compatibilidad mínima de extensión y host.

### 3.3 Grabación

El grabador debe capturar intención semántica, no solo eventos de bajo nivel:

- navegación;
- clic;
- escritura y cambios;
- selección;
- checkbox y radio;
- envío de formularios;
- apertura de pestañas o ventanas;
- carga y descarga de archivos;
- esperas relevantes;
- confirmaciones y mensajes de resultado.

Debe ignorar o redactar contraseñas, tokens y valores marcados como sensibles.

### 3.4 Editor

El editor debe permitir:

- reordenar, habilitar, deshabilitar y agrupar pasos;
- convertir valores grabados en variables;
- añadir precondiciones y postcondiciones;
- configurar timeouts y reintentos;
- marcar riesgo y confirmación;
- probar un paso aislado;
- inspeccionar y reemplazar selectores;
- insertar pausas de intervención humana;
- visualizar diferencias entre versión grabada y versión editada.

### 3.5 Variables y datos de entrada

Tipos mínimos:

- texto;
- número;
- booleano;
- fecha y hora;
- opción enumerada;
- archivo;
- secreto referenciado;
- lista o tabla de registros para ejecución repetida.

Debe distinguir entre valor fijo, variable, expresión segura y referencia a secreto. Las expresiones no deben permitir código arbitrario.

### 3.6 Ejecución

Modos previstos:

- paso a paso;
- ejecución supervisada;
- ejecución completa con pausas de confirmación;
- modo diagnóstico;
- simulación sin acciones irreversibles;
- repetición sobre un conjunto de entradas.

Cada paso debe producir un resultado estructurado: estado, duración, objetivo encontrado, selector usado, evidencia, error y política aplicada.

### 3.7 Recuperación de errores

Orden recomendado:

1. selector preferido;
2. selectores alternativos;
3. búsqueda semántica local;
4. heurísticas de similitud;
5. propuesta asistida por IA;
6. confirmación del usuario cuando la confianza sea insuficiente.

Toda reparación persistente crea una nueva versión de la rutina.

### 3.8 Historial y auditoría

Registrar:

- rutina y versión;
- sitio y dominio;
- inicio, fin y duración;
- usuario local o perfil;
- variables no sensibles o sus hashes cuando proceda;
- pasos, resultados y reintentos;
- confirmaciones;
- intervención de IA;
- artefactos de diagnóstico;
- resultado final.

No registrar contraseñas, cookies ni contenido sensible innecesario.

### 3.9 Asistencia de IA

Casos permitidos:

- proponer pasos a partir de una descripción;
- mapear datos a campos;
- clasificar elementos candidatos;
- reparar selectores;
- resumir fallos;
- extraer datos estructurados;
- explicar por qué se eligió un elemento.

La IA devuelve JSON validado. El motor decide si la propuesta es admisible. Las acciones de alto riesgo nunca se ejecutan solo porque el modelo lo indique.

### 3.10 Configuración y diagnóstico

Debe incluir:

- proveedores y modelos de IA;
- límites de coste y tokens;
- estado del host;
- versiones instaladas;
- permisos de Chrome;
- ubicación de datos;
- exportación de diagnóstico redactado;
- nivel de logging;
- comprobación de actualización y compatibilidad.

## 4. Requisitos no funcionales

### Seguridad

Mínimo privilegio, secretos fuera de la extensión, validación en límites, confirmación de acciones sensibles y auditoría.

### Fiabilidad

Pasos idempotentes cuando sea posible, postcondiciones, timeouts, reintentos controlados, checkpoints y recuperación tras reinicios.

### Explicabilidad

Cada paso debe poder explicar qué buscó, qué encontró, por qué actuó y cómo verificó el resultado.

### Rendimiento

La grabación no debe degradar perceptiblemente la página. El motor debe evitar enviar DOM completos a la IA y reducir contexto antes de procesarlo.

### Compatibilidad

Windows 11 y Chrome son el objetivo inicial. La arquitectura debe evitar bloquear una futura adaptación a Edge u otros navegadores Chromium.

### Mantenibilidad

Separación clara de dominio, infraestructura y UI; contratos versionados; pruebas automatizadas; dependencias encapsuladas.

### Privacidad

Local-first. No enviar datos fuera del equipo salvo acción explícita y política del proveedor configurado.

## 5. Alcance del MVP funcional

El MVP debe demostrar sobre una web local de prueba:

1. definición de un sitio autorizado;
2. grabación robusta de una rutina corta;
3. edición de nombre, variables y pasos;
4. ejecución determinista supervisada;
5. postcondiciones y error comprensible;
6. persistencia local;
7. historial de ejecución;
8. confirmación de una acción marcada como sensible;
9. exportación e importación sin secretos;
10. pruebas E2E reproducibles.

La integración con IA puede entrar al final del MVP o inmediatamente después, pero no debe bloquear la calidad del motor determinista.

## 6. Exclusiones iniciales

- automatización desatendida de alto riesgo;
- evasión de CAPTCHA o controles antiabuso;
- nube multiusuario;
- marketplace público;
- ejecución de scripts arbitrarios;
- soporte universal de cualquier web;
- automatización de escritorio fuera del navegador;
- sincronización de credenciales entre equipos.

## 7. Métricas iniciales

- porcentaje de pasos ejecutados sin recuperación;
- porcentaje reparado mediante selectores alternativos;
- tasa de falsos positivos de localización;
- tiempo medio por paso;
- número de confirmaciones inesperadas;
- porcentaje de ejecuciones completas;
- fallos por cambio de DOM;
- coste de IA por ejecución;
- tiempo de diagnóstico de una rutina fallida.

## 8. Criterios de aceptación de la propuesta

- existe consenso sobre alcance del MVP;
- están definidas responsabilidades de extensión y host;
- se acepta el principio determinista primero;
- se acepta el modelo local-first;
- se aprueba el catálogo inicial de capacidades y exclusiones;
- el plan por fases puede convertir esta propuesta en incrementos verificables.
