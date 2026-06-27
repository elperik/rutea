# 006_LIBRERIAS_Y_HERRAMIENTAS

Estado: Pendiente
Prioridad: Media
Responsable: Sin asignar
Dependencias: `003_ARQUITECTURA_Y_LIMITES`
Última revisión: 2026-06-27

## 1. Política

Se permite utilizar todas las librerías que resulten útiles. El objetivo no es minimizar artificialmente dependencias, sino evitar dependencias innecesarias, abandonadas, incompatibles o difíciles de sustituir.

La inclusión definitiva exige registrar motivo, licencia, versión, impacto, alternativa y pruebas.

## 2. Extensión y TypeScript

### Base de desarrollo

- TypeScript: contratos y tipado estricto.
- ESLint: reglas estáticas.
- Prettier: formato.
- Vite o esbuild: empaquetado si la estructura crece.
- WXT: candidato para gestionar Manifest V3, entradas y desarrollo multi-navegador.
- WebExtension Polyfill: candidato si se busca compatibilidad más allá de Chrome.

No migrar a un framework de extensión solo por comodidad; hacerlo cuando reduzca complejidad real de build, HMR, múltiples entrypoints o compatibilidad.

### Validación y contratos

- Zod: validación idiomática en TypeScript y tipos inferidos.
- Ajv: validación JSON Schema de alto rendimiento.
- `json-schema-to-typescript` o generación equivalente: evitar divergencia entre esquema y tipos.

Decisión pendiente: usar JSON Schema como fuente de verdad y generar tipos, o usar Zod como fuente de verdad y generar esquema. No mantener manualmente dos modelos equivalentes.

### Estado y almacenamiento

- `chrome.storage`: suficiente para estado pequeño y efímero.
- `idb` o Dexie: candidatos para caché estructurada dentro de la extensión.

La fuente de verdad duradera debería permanecer en Java/SQLite.

### UI

Opciones:

- HTML/TypeScript sin framework para un panel pequeño;
- Lit para componentes web ligeros;
- React, Preact o Vue si el editor requiere estado complejo, tablas, formularios y navegación.

La elección debe basarse en complejidad real del editor. Evitar introducir React antes de necesitar composición y estado significativo.

### Seguridad y accesibilidad

- DOMPurify: solo si se necesita representar HTML no confiable; preferir texto plano.
- axe-core: pruebas automáticas básicas de accesibilidad.

### Pruebas

- Vitest: unitarias y componentes.
- Playwright: E2E de extensión y páginas fixture.
- jsdom o happy-dom: solo para pruebas DOM que no requieran navegador real.

## 3. Host Java

### Serialización y contratos

- Jackson: JSON.
- NetworkNT JSON Schema Validator u otra implementación madura: validación de esquemas.

### Persistencia

- Xerial SQLite JDBC: acceso SQLite.
- Flyway: migraciones.
- HikariCP: solo si aporta valor; para SQLite local una conexión o pool mínimo puede ser suficiente.
- jOOQ: candidato si el modelo crece y se desea SQL tipado; no necesario en el MVP.
- JDBI: alternativa ligera para repositorios SQL.

### Seguridad y sistema operativo

- JNA: integración con Credential Manager o DPAPI en Windows.
- Bouncy Castle: solo para necesidades criptográficas no cubiertas por JCA; evitar criptografía propia.

### HTTP y resiliencia

- `java.net.http.HttpClient`: opción inicial sin dependencia.
- OkHttp: candidato si se requiere interceptores, streaming o ergonomía adicional.
- Resilience4j: reintentos, rate limits, circuit breakers y timeouts coordinados.

No combinar varias librerías HTTP sin necesidad.

### IA

- adaptadores propios como capa estable;
- SDK oficiales de proveedores cuando estén disponibles y sean adecuados;
- LangChain4j para tool calling, modelos múltiples o flujos complejos;
- Spring AI si se adopta Spring y su ecosistema aporta valor real.

Evitar un framework agente completo para la primera reparación de selectores.

### Navegador

- Playwright Java: automatización complementaria y pruebas.

### Observabilidad

- SLF4J + Logback: logging estructurado.
- Micrometer: candidato para métricas locales o exportables.
- OpenTelemetry: solo si aparece una necesidad real de trazas distribuidas.

### Pruebas y calidad

- JUnit 5;
- AssertJ;
- Mockito;
- WireMock para proveedores HTTP;
- jqwik para property-based testing;
- JaCoCo para cobertura;
- SpotBugs;
- Checkstyle o Spotless;
- OWASP Dependency-Check;
- ArchUnit para límites de paquetes si la arquitectura crece.

## 4. Build, CI y mantenimiento

- Maven inicialmente; Gradle solo si existe una ventaja concreta.
- npm con lockfile; evaluar pnpm si crece el workspace.
- GitHub Actions.
- Dependabot o Renovate para actualizaciones controladas.
- generación de SBOM en releases cuando el producto se distribuya.
- análisis de secretos y dependencias vulnerables en CI.

## 5. Criterios para aprobar una librería

Completar en el documento de la iniciativa:

| Criterio | Respuesta |
|---|---|
| Problema que resuelve | |
| Alternativas | |
| Licencia | |
| Mantenimiento | |
| Vulnerabilidades conocidas | |
| Dependencias transitivas | |
| Tamaño/arranque | |
| Encapsulación | |
| Estrategia de prueba | |
| Estrategia de actualización | |

## 6. Licencias

Las licencias permisivas suelen ser sencillas para distribución, pero toda dependencia debe revisarse. Dependencias copyleft, duales, con restricciones comerciales o binarios nativos requieren decisión explícita. Este control es técnico y de cumplimiento; no sustituye revisión legal cuando el producto se comercialice.

## 7. Decisiones inmediatas recomendadas

1. Añadir ESLint y Prettier.
2. Elegir una única fuente de verdad para contratos y validación runtime.
3. Añadir Vitest y Playwright.
4. Incorporar Jackson y validación JSON Schema al host.
5. Incorporar JUnit 5 y AssertJ.
6. Adoptar SQLite JDBC y Flyway al comenzar persistencia.
7. Mantener adaptadores propios para IA, secretos y navegador.
