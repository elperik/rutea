param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern("^[a-p]{32}$")]
    [string]$ExtensionId,

    # JDK a usar para ejecutar el host. Por defecto, $env:JAVA_HOME.
    [string]$JavaHome = $env:JAVA_HOME
)

# Registro de DESARROLLO del host Native Messaging: ejecuta el JAR con `java -jar`
# mediante un lanzador generado, sin empaquetar con jpackage. Para distribución
# real usar package-app.ps1 + register-chrome-host.ps1.
#
# El lanzador se genera en target/ (ignorado por Git) con la ruta concreta del
# JDK de esta máquina, de modo que no se versiona ninguna ruta local.

$ErrorActionPreference = "Stop"

$projectDirectory = Split-Path -Parent $PSScriptRoot
$targetDirectory = Join-Path $projectDirectory "target"
$jar = Join-Path $targetDirectory "rutea-native-host-0.1.0.jar"

if (-not (Test-Path $jar)) {
    throw "No existe $jar. Compila primero con: mvn -B -f native-host/pom.xml package"
}

if ([string]::IsNullOrWhiteSpace($JavaHome)) {
    throw "Indica -JavaHome o define la variable de entorno JAVA_HOME (se requiere JDK 21)."
}

$javaExe = Join-Path $JavaHome "bin/java.exe"
if (-not (Test-Path $javaExe)) {
    throw "No existe $javaExe. Revisa -JavaHome."
}

# Lanzador generado (no versionado).
$launcher = Join-Path $targetDirectory "rutea-host-launcher.bat"
$launcherContent = @"
@echo off
rem Lanzador de desarrollo generado por register-chrome-host-dev.ps1. No editar.
rem stdout queda reservado al protocolo Native Messaging.
"$javaExe" -jar "$jar"
"@
$ascii = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($launcher, $launcherContent, $ascii)

# Manifiesto de host nativo en el perfil del usuario.
$manifestDirectory = Join-Path $env:LOCALAPPDATA "Rutea"
New-Item -ItemType Directory -Path $manifestDirectory -Force | Out-Null
$manifestPath = Join-Path $manifestDirectory "es.etic.rutea.json"

$manifest = [ordered]@{
    name            = "es.etic.rutea"
    description     = "Host local de Rutea (desarrollo)"
    path            = (Resolve-Path $launcher).Path
    type            = "stdio"
    allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($manifestPath, $manifest, $ascii)

$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\es.etic.rutea"
New-Item -Path $registryPath -Force | Out-Null
Set-Item -Path $registryPath -Value $manifestPath

Write-Host "Host de desarrollo registrado para la extensión $ExtensionId"
Write-Host "Lanzador:    $launcher"
Write-Host "Manifiesto:  $manifestPath"
Write-Host "Si Chrome estaba abierto, reinícialo para que detecte el host."
