param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern("^[a-p]{32}$")]
    [string]$ExtensionId
)

$ErrorActionPreference = "Stop"

$projectDirectory = Split-Path -Parent $PSScriptRoot
$executable = Join-Path $projectDirectory "target/app-image/RuteaNativeHost/RuteaNativeHost.exe"

if (-not (Test-Path $executable)) {
    throw "No existe $executable. Ejecuta primero scripts/package-app.ps1."
}

$manifestDirectory = Join-Path $env:LOCALAPPDATA "Rutea"
$manifestPath = Join-Path $manifestDirectory "es.etic.rutea.json"
New-Item -ItemType Directory -Path $manifestDirectory -Force | Out-Null

$manifest = [ordered]@{
    name = "es.etic.rutea"
    description = "Host local de Rutea"
    path = (Resolve-Path $executable).Path
    type = "stdio"
    allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json -Depth 4

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($manifestPath, $manifest, $utf8WithoutBom)

$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\es.etic.rutea"
New-Item -Path $registryPath -Force | Out-Null
Set-Item -Path $registryPath -Value $manifestPath

Write-Host "Host registrado para la extensión $ExtensionId"
Write-Host "Manifiesto: $manifestPath"
