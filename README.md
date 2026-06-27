# Rutea

Rutea es una aplicación de navegación web asistida que permite grabar, editar y ejecutar rutinas repetitivas de forma controlada.

La arquitectura inicial separa:

- una extensión de Chrome en TypeScript para interactuar con el DOM y mostrar la interfaz;
- un host local en Java para persistencia, seguridad, acceso al sistema y futuras integraciones con IA;
- esquemas compartidos para que ambos componentes intercambien mensajes y rutinas de forma estable.

## Abrir en Visual Studio Code

Requisitos recomendados:

- Git;
- Visual Studio Code;
- Node.js 22 o superior;
- JDK 21;
- Maven 3.9 o superior;
- Google Chrome.

```powershell
git clone https://github.com/elperik/rutea.git
cd rutea
code rutea.code-workspace
```

Al abrir el workspace, instala las extensiones recomendadas. Después ejecuta desde **Terminal > Run Task**:

```text
Rutea: build all
```

## Probar la extensión

```powershell
cd extension
npm install
npm run build
```

En Chrome:

1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida**.
4. Selecciona `extension/dist`.
5. Abre Rutea desde el icono de la extensión.

La primera versión permite iniciar y detener una grabación básica y ver los pasos almacenados localmente.

## Compilar el host Java

```powershell
cd native-host
mvn clean package
```

Para crear una imagen ejecutable de Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-app.ps1
```

Después copia el identificador mostrado por Chrome en `chrome://extensions` y registra el host:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/register-chrome-host.ps1 -ExtensionId IDENTIFICADOR_EXTENSION
```

## Estructura

```text
rutea/
├── extension/       Extensión Chrome Manifest V3
├── native-host/     Proceso local Java y Native Messaging
├── shared/          Contratos y esquemas JSON
├── analisis/        Decisiones, alcance y arquitectura
├── .codex/agents/   Agentes especializados para Codex
├── .vscode/         Configuración y tareas de VS Code
├── AGENTS.md        Contexto persistente para agentes
└── CLAUDE.md        Entrada de contexto para Claude Code
```

## Estado

El repositorio contiene el andamiaje inicial del MVP. La prioridad es construir primero un motor determinista de rutinas; la IA se incorporará como apoyo para interpretar, reparar selectores y resolver ambigüedades, nunca como ejecutor libre de acciones arbitrarias.

Consulta [`analisis/README.md`](analisis/README.md) antes de tomar decisiones de arquitectura o ampliar el alcance.
