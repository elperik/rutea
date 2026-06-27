# Instrucciones del proyecto Rutea

Empieza por `AGENTS.md`. Para decisiones de arquitectura o cambios no triviales, lee también `analisis/README.md`.

## Arquitectura

- `extension/` es una extensión Chrome Manifest V3 escrita en TypeScript.
- `native-host/` es un host Native Messaging en Java 21.
- `shared/` contiene contratos JSON versionados.
- La extensión gestiona DOM e interfaz; Java gestiona secretos, persistencia, acceso local e IA.

## Convenciones

- Mantén la automatización determinista y restringida a acciones conocidas.
- No ejecutes código arbitrario generado por IA.
- No guardes secretos en la extensión ni en el repositorio.
- Valida todos los mensajes que cruzan el límite extensión-host.
- No amplíes permisos de Chrome sin una necesidad concreta.
- Usa selectores semánticos y condiciones posteriores en los pasos.
- Mantén `stdout` del host Java reservado para Native Messaging.
- Documenta cambios duraderos en `analisis/README.md`, no en archivos nuevos duplicados.

## Verificación

```powershell
cd extension
npm install
npm run build

cd ../native-host
mvn -B test package
```

Para cambios visibles o flujos de navegación, utiliza Playwright cuando exista un escenario reproducible y revisa consola, errores de red, permisos y estado almacenado.
