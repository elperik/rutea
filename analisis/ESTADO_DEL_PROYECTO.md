# Estado del proyecto Rutea

Última actualización: 2026-06-28

Resumen ejecutable del progreso para humanos y agentes. La fuente canónica por iniciativa sigue siendo `analisis/implementado/` y `analisis/en_desarrollo/`.

## 1. Qué hace Rutea hoy

Ciclo completo funcionando de extremo a extremo en local:

**Grabar → Editar → Versionar/Exportar → Ejecutar (supervisado) → Persistir en el host.**

- **Grabar**: el grabador captura clics, escrituras, selects y checks en el origen autorizado, con sesión persistente, continuidad entre navegaciones (reinyección en el mismo origen), deduplicación, redacción de contraseñas y selectores múltiples explicados.
- **Editar**: biblioteca de rutinas en el panel; editor para reordenar/eliminar pasos, ajustar riesgo/confirmación/timeout, renombrar y **convertir valores en variables** (incl. marcar secretos).
- **Versionar/Exportar**: exportación a un sobre con **hash SHA-256**; la importación verifica integridad y rechaza manipulaciones (o acepta una rutina cruda marcándola «no verificada»).
- **Ejecutar**: el player reproduce la rutina sobre el origen autorizado (`click/fill/select/check/wait/assert`), conducido por una **máquina de estados** pura, con **confirmación** de pasos sensibles, resolución de variables y **postcondiciones**. Restricción por dominio (`allowedDomains`) y permiso de host por sitio.
- **Persistir (host)**: el host Java guarda rutinas en **SQLite** y las expone por Native Messaging (`routine.save/list/get/delete`), validando contra el contrato.

## 2. Contratos y validación

- Fuente de verdad: **JSON Schema** en `shared/contracts/` y `shared/routine.schema.json`.
- En la extensión: validadores **standalone precompilados** (CSP-safe, sin `eval`) + tipos TS generados (`extension/scripts/generate-contracts.mjs`).
- En el host: mismos esquemas cargados del classpath; validación con NetworkNT.
- Negociación de protocolo `hello` y respuestas con taxonomía de errores acordada.

## 3. Fases (según `analisis/pendiente/002_PLAN_DESARROLLO_POR_FASES.md`)

| Fase | Estado | Notas |
|---|---|---|
| 0 — Base y contratos | ✅ Completa | Contratos validados en ambos lados, fixtures, CI, primera suite. |
| 1 — Grabador robusto | ✅ Completa | Sesión persistente, continuidad entre navegaciones, selectores explicados, redacción. |
| 2 — Dominio, biblioteca y editor | ✅ Completa | Rutina validada, biblioteca, export/import con integridad, editor, variables. |
| 3 — Ejecutor determinista | 🟡 En curso | Máquina de estados + player supervisado. Falta `navigate`/continuidad de ejecución, reintentos/recuperación. |
| 4 — Persistencia, historial y secretos | 🟡 En curso | Persistencia de rutinas en SQLite (host) hecha. Falta cablear la extensión, historial y **secretos**. |
| 5–8 | ⬜ Pendiente | IA, Playwright Java, empaquetado, etc. |

## 4. Cobertura de pruebas

- Extensión (Vitest): **92** pruebas (lógica pura + DOM del player con happy-dom).
- Host (JUnit): **17** pruebas (codec, validador, handler, persistencia SQLite).
- CI (GitHub Actions): jobs `extension` y `native-host` en cada PR.

## 5. Cómo construir y verificar

### Extensión (Node 22+)
```powershell
npm --prefix extension install
npm --prefix extension run format:check
npm --prefix extension run lint
npm --prefix extension run typecheck
npm --prefix extension test
npm --prefix extension run build   # genera extension/dist
```

### Host (JDK 21 + Maven)
En esta máquina, JDK 21 y Maven están fuera del PATH:
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.10"
$env:PATH = "$env:JAVA_HOME\bin;C:\apache-maven-3.9.16\bin;$env:PATH"
mvn -B -f native-host\pom.xml test package
```

### Sitio de fixtures (banco de pruebas determinista)
```powershell
python -m http.server 4321 --directory fixtures
# abrir http://localhost:4321/
```

### Cargar la extensión en Chrome
1. `chrome://extensions` → activar **Modo de desarrollador**.
2. **Cargar descomprimida** → `extension/dist`.
3. Abrir Rutea desde el icono (panel lateral).

### (Opcional) Registrar el host Java para Native Messaging
```powershell
native-host\scripts\register-chrome-host-dev.ps1 -ExtensionId <ID_de_chrome://extensions> -JavaHome "C:\Program Files\Java\jdk-21.0.10"
# reiniciar Chrome tras registrar
```

## 6. Prueba guiada (sobre fixtures, sin datos reales)

1. Servir fixtures y cargar la extensión (ver arriba).
2. En `http://localhost:4321/`, pulsar **Iniciar** y aceptar el permiso del sitio.
3. Rellenar **Nombre**, marcar **Recibir boletín**, elegir **País**, pulsar **Provocar éxito**. Detener.
4. **Guardar grabación como rutina** (poner nombre).
5. **Editar** la rutina: convertir el valor de un paso en variable, ajustar riesgo/confirmación.
6. **Ejecutar**: aceptar permiso; ver cómo se rellenan campos y se pulsan botones; confirmar los pasos marcados sensibles.
7. **Exportar** (descarga `.rutea.json` con `integrity.hash`) y **Importar** para comprobar la verificación; editar el JSON a mano y reimportar para ver el rechazo.

Hay una rutina de ejemplo lista para importar en [`fixtures/examples/ejemplo-consulta.rutea.json`](../fixtures/examples/ejemplo-consulta.rutea.json).

## 7. Proyecto piloto GPEX

GPEX (`intranet.gpex.es`) es el primer proyecto piloto (ver `analisis/PROYECTOS.md` y `analisis/en_desarrollo/008_PRIMER_PROYECTO_GPEX.md`). Reglas de seguridad vigentes:

- Las credenciales **no** se almacenan en el repositorio, Markdown, código, fixtures ni `chrome.storage`. Hasta que exista el almacén seguro (siguiente slice de Fase 4), **el inicio de sesión lo hace la persona manualmente**.
- Las primeras pruebas contra el entorno real deben ser **de solo lectura o supervisadas**; nada de altas/bajas/envíos sin autorización explícita del flujo concreto.
- Las pruebas **autónomas** se hacen sobre los **fixtures locales**, no sobre el intranet real.
