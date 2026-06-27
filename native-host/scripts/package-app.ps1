$ErrorActionPreference = "Stop"

$projectDirectory = Split-Path -Parent $PSScriptRoot
Push-Location $projectDirectory

try {
    mvn -B clean package

    $destination = Join-Path $projectDirectory "target/app-image"
    if (Test-Path $destination) {
        Remove-Item $destination -Recurse -Force
    }

    jpackage `
        --type app-image `
        --name RuteaNativeHost `
        --input (Join-Path $projectDirectory "target") `
        --main-jar "rutea-native-host-0.1.0.jar" `
        --main-class "es.etic.rutea.NativeHostMain" `
        --dest $destination `
        --win-console

    Write-Host "Host creado en: $destination/RuteaNativeHost"
} finally {
    Pop-Location
}
