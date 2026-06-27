# Instrucciones del proyecto Rutea

Empieza por `AGENTS.md` y `analisis/README.md`. Para arquitectura, contratos, seguridad, dependencias o cambios multi-componente, lee `analisis/CONVENCIONES_DE_TRABAJO.md`.

## Documentación por estado

Toda iniciativa debe vivir en una sola carpeta:

```text
analisis/pendiente -> analisis/en_desarrollo -> analisis/implementado
```

Al comenzar código, mueve el documento a `en_desarrollo`. Al terminar con pruebas y evidencia, muévelo a `implementado`. No dupliques documentos ni declares implementado lo que solo está diseñado.

## Arquitectura

- `extension/`: Chrome Manifest V3 y TypeScript.
- `native-host/`: host Native Messaging Java 21.
- `shared/`: contratos JSON versionados.
- La extensión gestiona DOM e interfaz; Java gestiona secretos, persistencia, acceso local, IA y Playwright avanzado.

## Convenciones

- Automatización determinista y acciones conocidas.
- IA con salida estructurada, no código arbitrario.
- Secretos fuera de extensión y repositorio.
- Validación de todo mensaje que cruce límites.
- Permisos mínimos.
- Selectores semánticos y postcondiciones.
- `stdout` del host reservado a Native Messaging.
- Acciones sensibles con confirmación.

Se pueden usar librerías útiles. Evalúa licencia, mantenimiento, seguridad, coste técnico, dependencias transitivas y estrategia de sustitución antes de incorporarlas.

## Verificación

```powershell
cd extension
npm install
npm run build

cd ../native-host
mvn -B test package
```

Para cambios visibles o de navegación, utiliza Playwright y revisa consola, red, permisos, estado y evidencia.
