# Catálogo de proyectos de Rutea

Este documento registra las aplicaciones web concretas sobre las que se diseñan, prueban y validan las capacidades de Rutea.

Un proyecto representa una aplicación o dominio funcional con sus propias rutinas, permisos, políticas de seguridad, credenciales referenciadas y criterios de aceptación. La arquitectura debe admitir varios proyectos sin introducir condiciones específicas de uno de ellos en el núcleo general.

## Reglas

- Cada proyecto debe tener un identificador estable y un documento técnico propio.
- Los datos específicos del proyecto deben permanecer en configuración o perfiles, no hardcodeados en el motor.
- Las credenciales nunca se almacenan en Git, Markdown, `chrome.storage` ni código fuente.
- Los usuarios y contraseñas se registran únicamente en el almacén seguro local mediante referencias opacas.
- Las pruebas contra entornos reales deben ser inicialmente de solo lectura o supervisadas.
- No se ejecutan altas, modificaciones, envíos o borrados reales sin autorización explícita para el flujo concreto.
- Capturas, DOM, logs y trazas deben revisarse y redactarse antes de conservarse.
- Una rutina debe declarar a qué proyecto y sitio pertenece.

## Proyectos registrados

| Código | Proyecto | URL base | Estado | Prioridad | Documento |
|---|---|---|---|---|---|
| `GPEX-001` | Intranet GPEX | `https://intranet.gpex.es/` | Piloto inicial pendiente | Alta | [`pendiente/008_PRIMER_PROYECTO_GPEX.md`](pendiente/008_PRIMER_PROYECTO_GPEX.md) |

## Modelo previsto

```text
Project
├── id
├── name
├── description
├── sites[]
├── secretReferences[]
├── policies
├── routines[]
├── testProfiles[]
└── metadata
```

Un proyecto puede contener varios sitios u orígenes relacionados. Un sitio pertenece a un solo proyecto en la primera versión, aunque el dominio interno debe permitir reutilizar plantillas de rutina sin compartir credenciales.

## Referencias de secretos

Para el proyecto GPEX se reservan inicialmente estas referencias lógicas:

```text
secret:gpex.login.username
secret:gpex.login.password
```

Las referencias pueden versionarse o sustituirse, pero el valor real nunca forma parte de una rutina exportada ni de la documentación.

## Incorporación de nuevos proyectos

Para añadir otro proyecto:

1. Crear un documento `analisis/pendiente/NNN_PRIMER_PROYECTO_<NOMBRE>.md` o una iniciativa equivalente.
2. Añadir una fila a este catálogo.
3. Definir dominios autorizados, operaciones sensibles y credenciales referenciadas.
4. Seleccionar rutinas piloto y criterios de aceptación.
5. Evitar modificar el núcleo con lógica específica del proyecto; usar adaptadores, configuración o políticas cuando sea necesario.
