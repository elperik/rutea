# 005_SEGURIDAD_PRIVACIDAD_Y_PERMISOS

Estado: Pendiente
Prioridad: Crítica
Responsable: Sin asignar
Dependencias: `003_ARQUITECTURA_Y_LIMITES`, `004_MODELO_DE_RUTINAS_Y_EJECUCION`
Última revisión: 2026-06-27

## 1. Activos protegidos

- credenciales y claves API;
- cookies y sesiones;
- datos introducidos en formularios;
- rutinas y variables;
- historial y artefactos;
- acceso a archivos locales;
- capacidad de ejecutar acciones en webs autenticadas;
- integridad de la extensión y el host;
- presupuesto y cuota de proveedores de IA.

## 2. Límites de confianza

- página web frente a content script;
- content script frente a service worker;
- extensión frente a host Java;
- host frente a sistema operativo;
- host frente a proveedores externos;
- datos importados frente al dominio interno;
- artefactos de diagnóstico frente a exportación.

## 3. Amenazas principales

### Página hostil

Una web puede modificar DOM, emitir eventos artificiales, intentar confundir selectores o introducir contenido malicioso en mensajes y logs.

### Extensión comprometida o excesivamente privilegiada

Permisos amplios podrían exponer páginas no autorizadas. Evitar `<all_urls>` salvo decisión explícita y justificada.

### Suplantación del host

El manifiesto Native Messaging debe permitir únicamente el identificador de extensión esperado y apuntar a una ruta protegida.

### Mensajes manipulados

Validar longitud, versión, tipo, esquema, dominio, identificadores y límites. Rechazar campos desconocidos en contratos sensibles.

### Fuga a IA

No enviar cookies, contraseñas, tokens, identificadores personales innecesarios ni DOM completos. Aplicar reducción y redacción antes de cada solicitud.

### Inyección

No ejecutar JavaScript, shell, SQL, expresiones o plantillas arbitrarias procedentes de rutinas, webs o modelos.

### Confused deputy

El host no debe realizar una acción privilegiada solo porque la extensión la solicita. Debe comprobar política, dominio, capacidad, usuario y confirmación.

## 4. Secretos

- almacenar mediante un `SecretStore` del sistema;
- usar referencias opacas en rutinas;
- no exportar el valor;
- no registrar el valor;
- evitar mantenerlo más tiempo del necesario en memoria;
- diferenciar clave API, contraseña web y token temporal;
- permitir revocación y sustitución;
- no sincronizar sin cifrado y diseño específico.

## 5. Permisos Chrome

Cada permiso debe documentar:

- funcionalidad que lo necesita;
- momento de solicitud;
- alternativa con menor privilegio;
- datos accesibles;
- impacto al usuario.

Preferir permisos opcionales por sitio cuando sea viable. `activeTab` es preferible para acciones iniciadas por el usuario; los permisos persistentes deben limitarse a orígenes configurados.

## 6. Dominios autorizados

Una rutina solo puede operar si:

- el origen actual coincide con el sitio;
- la acción de navegación mantiene el origen permitido o existe transición autorizada;
- frames y recursos externos se validan por separado;
- redirecciones no amplían permisos implícitamente.

## 7. Acciones sensibles

Riesgo alto o irreversible:

- enviar o publicar;
- borrar;
- pagar o comprar;
- firmar;
- facturar;
- aceptar condiciones;
- cambiar permisos;
- enviar email o mensaje;
- subir documentación sensible.

Requieren confirmación explícita con resumen y postcondición. No deben reintentarse automáticamente.

## 8. Importación y exportación

- validar esquema y tamaño;
- rechazar rutas absolutas y traversal;
- no incluir secretos;
- firmar o verificar hash si se comparte entre equipos;
- marcar rutinas importadas como no confiables hasta revisarlas;
- mostrar dominios y acciones sensibles antes de activar.

## 9. Logs y artefactos

- logs estructurados;
- redacción centralizada;
- niveles configurables;
- retención limitada;
- capturas desactivadas o recortadas en campos sensibles;
- DOM reducido;
- exportación de diagnóstico con revisión previa;
- `stdout` del host reservado al protocolo.

## 10. Proveedores de IA

Por proveedor configurar:

- endpoint;
- modelo;
- región o tratamiento aplicable;
- tipos de datos permitidos;
- límite de coste;
- timeout;
- retención conocida;
- disponibilidad de modo local.

Las respuestas se consideran no confiables y deben validarse.

## 11. Actualizaciones y cadena de suministro

- lockfiles;
- revisión automatizada de dependencias;
- verificación de integridad;
- CI con análisis estático;
- firma de artefactos cuando proceda;
- versiones compatibles de extensión y host;
- no descargar código ejecutable dinámico en la extensión;
- revisar licencias y binarios nativos.

## 12. Pruebas de seguridad

- contratos con payloads malformados y sobredimensionados;
- orígenes no autorizados;
- mensajes falsificados;
- secretos en logs y exportaciones;
- HTML malicioso en nombres o descripciones;
- prompt injection desde la página;
- path traversal;
- reintentos de acciones irreversibles;
- incompatibilidad de protocolo;
- caída del host durante una ejecución.

## 13. Criterios de aceptación

- threat model revisado;
- permisos mínimos documentados;
- secretos fuera de extensión y base en claro;
- redacción probada;
- contratos validados;
- acciones sensibles confirmadas;
- importaciones tratadas como no confiables;
- dependencias y actualizaciones controladas.
